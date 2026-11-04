import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { AppError } from '@curebase/shared'

/** A request that throws something other than an AppError hit a bug in our code, not a failed request: log it. */
const logBugs = (error: unknown) => {
  if (!(error instanceof AppError)) console.error(error)
}

/** The app's QueryClient (ADR 002). Retries are off: repeating a 4xx is wrong, and a down server should say so at once. */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: logBugs }),
    mutationCache: new MutationCache({ onError: logBugs }),
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
