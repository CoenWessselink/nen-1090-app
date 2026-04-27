import { useQuery } from '@tanstack/react-query';
import { searchGlobal } from '@/api/search';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function useGlobalSearch(query: string) {
  const debounced = useDebouncedValue(query, 250);
  return useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => searchGlobal(debounced),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });
}
