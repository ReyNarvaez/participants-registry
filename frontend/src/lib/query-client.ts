import { QueryCache, QueryClient } from '@tanstack/react-query'
import { AppError } from '@curebase/shared'

/**
 * The app's QueryClient (ADR 002). Retries are off: repeating a 4xx is wrong, and a down server should say so at once.
 * A query that throws something other than an AppError hit a bug in our code, not a failed request: it is logged.
 * (Mutations are awaited by their callers, which log their own.)
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (!(error instanceof AppError)) console.error(error)
      },
    }),
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
