import { AppError, appError } from '@curebase/shared'

/**
 * fetch + JSON for this app's API (ADR 002 › Frontend layout). Resolves with the response body, cast rather than
 * parsed (the backend is ours). Throws an AppError: the one the server sent, or UNAVAILABLE when no readable
 * response arrived (a network failure, or a non-JSON body such as a proxy's HTML error page).
 * Only fetch and JSON parsing are caught, so a bug in a caller is never reported as a network problem.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, init)
  } catch {
    throw appError.unavailable()
  }
  const body: unknown = await res.json().catch(() => undefined)
  if (!res.ok) throw AppError.fromResponse(body)
  if (body === undefined) throw appError.unavailable()
  return body as T
}
