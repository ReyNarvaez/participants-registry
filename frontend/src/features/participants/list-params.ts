import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { listParticipantsQuerySchema } from '@curebase/shared'

/** The list's page and BMI range. The bounds stay the strings staff typed: String(1e-7) is '1e-7', which the server rejects. */
export type ListParams = { offset: number; minBmi?: string; maxBmi?: string }
export type BmiRange = Pick<ListParams, 'minBmi' | 'maxBmi'>

const keys = ['offset', 'minBmi', 'maxBmi'] as const

/**
 * The list params a URL holds. The URL is untrusted input (ADR 002), so each param must pass the shared query
 * schema on its own, and a min above max drops both bounds. `dropped` says whether anything was thrown away.
 */
export function parseListParams(search: URLSearchParams): { params: ListParams; dropped: boolean } {
  const kept: Partial<Record<(typeof keys)[number], string>> = {}
  let dropped = false
  for (const key of keys) {
    const values = search.getAll(key)
    if (values.length === 0) continue
    if (values.length === 1 && listParticipantsQuerySchema.shape[key].safeParse(values[0]).success) kept[key] = values[0]
    else dropped = true
  }
  if (!listParticipantsQuerySchema.safeParse(kept).success) {
    delete kept.minBmi
    delete kept.maxBmi
    dropped = true
  }
  return { params: { offset: Number(kept.offset ?? 0), minBmi: kept.minBmi, maxBmi: kept.maxBmi }, dropped }
}

function toSearch({ offset, minBmi, maxBmi }: ListParams) {
  const search = new URLSearchParams()
  if (offset) search.set('offset', String(offset))
  if (minBmi !== undefined) search.set('minBmi', minBmi)
  if (maxBmi !== undefined) search.set('maxBmi', maxBmi)
  return search
}

/** The list's state, kept in the URL so refresh keeps it, Back/Forward move through it and a view can be shared. */
export function useListParams() {
  const [search, setSearch] = useSearchParams()
  const { params } = parseListParams(search)
  const go = (next: ListParams, replace = false) => setSearch(toSearch(next), { replace })
  return {
    params,
    /** Another page of the same range. */
    setOffset: (offset: number) => go({ ...params, offset }),
    /** A new range (empty clears it), from page 1. */
    setRange: (range: BmiRange) => go({ offset: 0, ...range }),
    /**
     * Page 1 of the range the URL holds when called (safe after an await); `replace` when correcting the URL
     * rather than moving through it.
     */
    firstPage: (replace = false) =>
      setSearch((current) => toSearch({ ...parseListParams(current).params, offset: 0 }), { replace }),
  }
}

/** Removes invalid list params from the URL, replacing the entry so Back doesn't return to them. Used once, by the list. */
export function useDropInvalidListParams() {
  const [search, setSearch] = useSearchParams()
  const { params, dropped } = parseListParams(search)
  useEffect(() => {
    if (dropped) setSearch(toSearch(params), { replace: true })
  })
}
