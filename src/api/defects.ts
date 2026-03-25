import type { Defect } from '@/types/domain';
import type { ListParams } from '@/types/api';

const defectStore = new Map<string, Defect>();

export async function getDefects(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  const items = Array.from(defectStore.values()).filter((row) => !projectId || String((row as unknown as Record<string, unknown>).project_id || '') === String(projectId));
  return { items, total: items.length, page: 1, limit: 25 };
}
export async function getDefect(defectId: string | number) { const item = defectStore.get(String(defectId)); if (!item) throw new Error('Defect niet gevonden.'); return item; }
export async function createDefect(projectId: string | number, weldId: string | number, payload: Record<string, unknown>) {
  const id = String(Date.now());
  const item = { id, weld_id: weldId, project_id: projectId, defect_type: String(payload.defect_type || payload.type || 'defect'), severity: String(payload.severity || 'C'), status: String(payload.status || 'open'), description: String(payload.description || payload.notes || '') } as unknown as Defect;
  defectStore.set(id, item);
  return item;
}
export async function updateDefect(defectId: string | number, payload: Record<string, unknown>) { const current = (await getDefect(defectId)) as unknown as Record<string, unknown>; const next = { ...current, ...payload, id: defectId } as unknown as Defect; defectStore.set(String(defectId), next); return next; }
export async function resolveDefect(defectId: string | number) { return await updateDefect(defectId, { status: 'resolved' }); }
export async function reopenDefect(defectId: string | number) { return await updateDefect(defectId, { status: 'open' }); }
export async function deleteDefect(defectId: string | number) { defectStore.delete(String(defectId)); }
