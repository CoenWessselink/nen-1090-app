import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { SessionProvider } from '@/app/session/SessionContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { useUiStore } from '@/app/store/ui-store';
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
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: {
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
