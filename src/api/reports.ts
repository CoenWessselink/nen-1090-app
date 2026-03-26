import { optionalRequest } from '@/api/client';
import type { ReportItem } from '@/types/domain';
import type { ListParams } from '@/types/api';
import { withQuery } from '@/utils/api';

type ReportResponse = ReportItem[] | { items?: ReportItem[]; data?: ReportItem[]; results?: ReportItem[]; total?: number; page?: number; limit?: number };

export async function getReports(params?: ListParams): Promise<ReportResponse> {
  return (
    (await optionalRequest<ReportResponse>([
      withQuery('/reports', params),
    ])) || { items: [], total: 0, page: Number(params?.page || 1), limit: Number(params?.limit || params?.pageSize || 10) }
  );
}
