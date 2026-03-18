import { optionalRequest } from '@/api/client';
import type { GlobalSearchResponse } from '@/types/domain';

export function searchGlobal(query: string) {
  if (!query.trim()) return Promise.resolve(null);
  return optionalRequest<GlobalSearchResponse>([`/search?q=${encodeURIComponent(query.trim())}`]);
}
