import { useQuery } from '@tanstack/react-query';
import { getPlanningItems } from '@/api/planning';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function usePlanning(params?: ListParams) {
  return useQuery({
    queryKey: ['planning', params],
    queryFn: async () => normalizeListResponse(await getPlanningItems(params)),
  });
}
