import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { SessionProvider } from '@/app/session/SessionContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { notifyApiError } from '@/lib/apiErrorHandler';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            notifyApiError('Data laden mislukt', error);
          },
        }),
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            networkMode: 'online',
            staleTime: 60_000,
            gcTime: 5 * 60_000,
          },
          mutations: {
            networkMode: 'online',
            onError: (error) => {
              notifyApiError('Actie mislukt', error);
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
