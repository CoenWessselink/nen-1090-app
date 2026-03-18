import { normalizeListResponse } from '@/utils/api';

export type ContractValidation = {
  ok: boolean;
  reason: string;
};

export function validateObjectPayload(payload: unknown): ContractValidation {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'Response is geen object-payload.' };
  }
  return { ok: true, reason: 'Object-payload ontvangen.' };
}

export function validateListPayload(payload: unknown): ContractValidation {
  try {
    const normalized = normalizeListResponse(payload as never);
    if (!Array.isArray(normalized.items)) {
      return { ok: false, reason: 'Response bevat geen lijst-items.' };
    }
    return {
      ok: true,
      reason: `Lijstcontract bevestigd (${normalized.items.length} item(s), totaal ${normalized.total}).`,
    };
  } catch {
    return { ok: false, reason: 'Response kon niet als lijstcontract worden genormaliseerd.' };
  }
}
