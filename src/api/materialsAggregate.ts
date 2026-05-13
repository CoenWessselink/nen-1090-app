import { ApiError, apiRequest } from '@/api/client';
import { getProjectSelectedMaterials } from '@/api/projects';
import { getMaterials } from '@/api/settings';
import { normalizeListResponse, type NormalizedListResult } from '@/utils/api';

export type MaterialRecord = Record<string, unknown>;

type MaterialsListPayload =
  | MaterialRecord[]
  | {
      items?: MaterialRecord[];
      data?: MaterialRecord[];
      results?: MaterialRecord[];
      total?: number;
      page?: number;
      limit?: number;
    };

export type ProjectMaterialsAggregateMeta = {
  source: 'server' | 'composed';
  aggregate_version?: number;
};

export type ProjectMaterialsAggregate = {
  meta: ProjectMaterialsAggregateMeta;
  catalog: NormalizedListResult<MaterialRecord>;
  selected: MaterialRecord[];
};

function normalizeSelectedRows(rows: unknown): MaterialRecord[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    if (!row || typeof row !== 'object') {
      return {};
    }

    const r = row as MaterialRecord;
    const id = r.id ?? r.material_id ?? r.materialId;
    return id !== undefined && id !== null && id !== '' ? { ...r, id } : { ...r };
  });
}

function isServerMaterialsAggregate(value: unknown): value is {
  catalog: MaterialsListPayload;
  selected: unknown;
  meta?: { aggregate_version?: number };
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const o = value as Record<string, unknown>;
  if (o.catalog === undefined || o.catalog === null || !Array.isArray(o.selected)) {
    return false;
  }

  return true;
}

async function composeProjectMaterialsAggregate(projectId: string): Promise<ProjectMaterialsAggregate> {
  const [catalogPayload, selectedPayload] = await Promise.all([
    getMaterials(),
    getProjectSelectedMaterials(projectId),
  ]);

  return {
    meta: { source: 'composed' },
    catalog: normalizeListResponse(catalogPayload as MaterialsListPayload),
    selected: normalizeSelectedRows(selectedPayload),
  };
}

/**
 * Canonical project-scoped materials runtime: tenant masterdata catalog + project selection.
 * Prefer GET /projects/{id}/materials-aggregate when the API exposes it; otherwise compose from canonical endpoints.
 */
export async function fetchProjectMaterialsAggregate(projectId: string | number): Promise<ProjectMaterialsAggregate> {
  const id = String(projectId);

  try {
    const raw = await apiRequest<unknown>(`/projects/${id}/materials-aggregate`);

    if (!isServerMaterialsAggregate(raw)) {
      throw new ApiError('Ongeldig materials-aggregate antwoord.', 502);
    }

    const metaBlock =
      raw.meta && typeof raw.meta === 'object'
        ? (raw.meta as { aggregate_version?: number })
        : undefined;

    return {
      meta: {
        source: 'server',
        aggregate_version:
          metaBlock?.aggregate_version !== undefined
            ? Number(metaBlock.aggregate_version)
            : undefined,
      },
      catalog: normalizeListResponse(raw.catalog as MaterialsListPayload),
      selected: normalizeSelectedRows(raw.selected),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return composeProjectMaterialsAggregate(id);
    }
    throw error;
  }
}
