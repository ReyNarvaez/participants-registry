import { AppError, appError } from '@curebase/shared'

// ponytail: one fixed timeout for every request; make it per-call if a slow endpoint (an export, say) arrives.
const TIMEOUT_MS = 15_000

/**
 * fetch + JSON for this app's API (ADR 002 › Frontend layout). Resolves with the response body, cast rather than
 * parsed (the backend is ours). Throws an AppError: the one the server sent, or UNAVAILABLE when no readable
 * response arrived (a network failure, a timeout, or a non-JSON body such as a proxy's HTML error page).
 * Only fetch and JSON parsing are caught, so a bug in a caller is never reported as a network problem.
 * `init.signal` (e.g. TanStack Query's) cancels the request; a request that hangs gives up after 15 seconds.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, signal })
  } catch {
    throw appError.unavailable()
  }
  const body: unknown = await res.json().catch(() => undefined)
  if (!res.ok) throw AppError.fromResponse(body)
  if (body === undefined) throw appError.unavailable()
  return body as T
}

/** The error to show for anything a request path threw: an AppError as is, anything else (a bug) as INTERNAL_ERROR. */
export const asAppError = (error: unknown) => (error instanceof AppError ? error : appError.internal())
