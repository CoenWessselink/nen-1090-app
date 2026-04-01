import type { ApiListResponse, ListParams, PaginatedApiResponse } from '@/types/api';

type LooseListResponse<T> = T[] | ApiListResponse<T> | PaginatedApiResponse<T> | null | undefined;

export type NormalizedListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function normalizeListResponse<T>(payload: LooseListResponse<T>): NormalizedListResult<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      page: 1,
      pageSize: payload.length || 10,
    };
  }

  const source = (payload || {}) as PaginatedApiResponse<T>;
  const items = source.items || source.data || source.results || source.rows || [];
  const total = Number(source.total ?? source.count ?? items.length ?? 0);
  const page = Number(source.page ?? source.current_page ?? 1);
  const pageSize = Number(source.limit ?? source.pageSize ?? source.page_size ?? items.length ?? 10);

  return {
    items: Array.isArray(items) ? items : [],
    total: Number.isFinite(total) ? total : 0,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10,
  };
}

export function extractApiMessage(details: unknown): string | null {
  if (!details) return null;
  if (typeof details === 'string') return details;
  if (typeof details === 'object') {
    const candidate = details as { detail?: unknown; message?: unknown; error?: unknown };
    const detail = candidate.detail ?? candidate.message ?? candidate.error;
    if (typeof detail === 'string') return detail;
  }
  return null;
}

export function validateListPayload(payload: unknown): { ok: boolean; reason: string } {
  if (Array.isArray(payload)) return { ok: true, reason: 'Array-contract bevestigd.' };
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'Geen object- of arraypayload ontvangen.' };

  const source = payload as PaginatedApiResponse<unknown>;
  const items = source.items || source.data || source.results || source.rows;
  if (!Array.isArray(items)) return { ok: false, reason: 'items/data/results/rows ontbreekt of is geen array.' };
  return { ok: true, reason: 'Lijstcontract bevestigd.' };
}

export function validateObjectPayload(payload: unknown): { ok: boolean; reason: string } {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return { ok: true, reason: 'Object-contract bevestigd.' };
  return { ok: false, reason: 'Verwacht objectpayload.' };
}

/**
 * Frontend hardening:
 * - clamp overly large limits that trigger 422 on live backend
 * - do not send unsupported generic sort/direction params
 * - do not send brittle status=open/pending list params from generic widgets
 * - keep project_id / tenant_id / search stable
 */
export function normalizeListParams(params?: ListParams): Record<string, string> {
  if (!params) return {};

  const normalized: Record<string, string> = {};
  const source = { ...params } as ListParams & Record<string, unknown>;

  const page = Number(source.page ?? 1);
  const rawLimit = Number(source.limit ?? source.pageSize ?? 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
  const projectId = source.project_id ?? source.projectId;
  const tenantId = source.tenant_id;

  if (Number.isFinite(page) && page > 0) normalized.page = String(page);
  if (Number.isFinite(limit) && limit > 0) normalized.limit = String(limit);
  if (typeof source.search === 'string' && source.search.trim()) normalized.search = source.search.trim();

  if (projectId !== undefined && projectId !== null && projectId !== '') normalized.project_id = String(projectId);
  if (tenantId !== undefined && tenantId !== null && tenantId !== '') normalized.tenant_id = String(tenantId);

  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (
      [
        'page',
        'limit',
        'pageSize',
        'search',
        'sort',
        'status',
        'direction',
        'project_id',
        'projectId',
        'tenant_id',
      ].includes(key)
    ) {
      return;
    }
    normalized[key] = String(value);
  });

  return normalized;
}

export function buildQueryString(params?: ListParams): string {
  const normalized = normalizeListParams(params);
  const searchParams = new URLSearchParams(normalized);
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function withQuery(path: string, params?: ListParams): string {
  return `${path}${buildQueryString(params)}`;
}
