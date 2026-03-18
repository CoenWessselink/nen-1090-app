import { listRequest } from '@/api/client';
import type { ReportItem } from '@/types/domain';
import type { ListParams } from '@/types/api';

export function getReports(params?: ListParams) {
  return listRequest<ReportItem[] | { items?: ReportItem[]; data?: ReportItem[]; results?: ReportItem[] }>('/reports', params);
}
