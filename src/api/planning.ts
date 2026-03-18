import { listRequest } from '@/api/client';
import type { PlanningItem } from '@/types/domain';
import type { ListParams } from '@/types/api';

export function getPlanningItems(params?: ListParams) {
  return listRequest<PlanningItem[] | { items?: PlanningItem[]; data?: PlanningItem[]; results?: PlanningItem[] }>('/planning', params);
}
