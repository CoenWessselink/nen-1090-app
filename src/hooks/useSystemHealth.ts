import { useQuery } from '@tanstack/react-query';
import { healthRequest } from '@/api/client';
import type { HealthResponse } from '@/types/api';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => healthRequest<HealthResponse>(),
  });
}
