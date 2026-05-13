import { useQuery } from '@tanstack/react-query';
import { getCeDocuments } from '@/api/ce';
import { useAuthStore } from '@/app/store/auth-store';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useCeDocuments(params?: ListParams) {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const token = useAuthStore((s) => s.token);
  const hasSession = Boolean(useAuthStore((s) => s.token || s.user));

  return useQuery({
    queryKey: ['ce-documents', params, tenantId, token],
    queryFn: async () => normalizeListResponse(await getCeDocuments(params)),
    enabled: hasSession,
  });
}
