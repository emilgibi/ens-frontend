'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const CONFIGURATION = {
  defaultOptions: {
    queries: {
      gcTime: 5 * 1000 * 60, // 5 minutes
      staleTime: 5 * 1000 * 60, // 5 minutes
    },
  },
};

const queryClient = new QueryClient(CONFIGURATION);

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
