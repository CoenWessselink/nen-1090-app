import { useQuery } from '@tanstack/react-query';
import { getCeDocuments } from '@/api/ce';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useCeDocuments(params?: ListParams) {
  return useQuery({ queryKey: ['ce-documents', params], queryFn: async () => normalizeListResponse(await getCeDocuments(params)) });
}
