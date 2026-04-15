'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { AxiosError } from 'axios'

function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status
  // Never retry client-side errors (4xx) — retrying 401 causes infinite loops
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < 1
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: shouldRetry,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
