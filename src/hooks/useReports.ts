import { useQuery } from '@tanstack/react-query';
import { getReports } from '@/api/reports';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useReports(params?: ListParams) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => normalizeListResponse(await getReports(params)),
  });
}
