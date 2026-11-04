import { useEffect, useState } from 'react'
import { AppError, type ParticipantList as ParticipantListResponse } from '@curebase/shared'
import { listParticipants } from '../api'
import { useListParams } from '../list-params'
import { BmiFilter } from './BmiFilter'

/**
 * Newest first, one page at a time, filterable by BMI. Its page and range live in the URL (useListParams);
 * the rows shown stay until the requested page arrives.
 */
export function ParticipantList() {
  const { params, setOffset, setRange, firstPage } = useListParams()
  const { offset, minBmi, maxBmi } = params
  // `filtered` records the range that produced this page, so the empty message matches the rows on screen.
  const [list, setList] = useState<ParticipantListResponse & { filtered: boolean }>()
  const [loadError, setLoadError] = useState<string>()

  useEffect(() => {
    let current = true // ignore a response that lands after a newer request
    listParticipants({ offset, minBmi, maxBmi }).then(
      (page) => {
        if (!current) return
        setList({ ...page, filtered: minBmi !== undefined || maxBmi !== undefined })
        setLoadError(undefined)
      },
      (error: unknown) => {
        if (!(error instanceof AppError)) throw error // a bug, not a failed request
        if (current) setLoadError(`Could not load participants (${error.message})`)
      },
    )
    return () => {
      current = false
    }
  }, [offset, minBmi, maxBmi])

  // A stale link, or a list that shrank, can point past the last page: show page 1 instead of an empty page.
  const pastTheEnd = list !== undefined && list.offset === offset && offset > 0 && offset >= list.total
  useEffect(() => {
    if (pastTheEnd) firstPage(true)
  })

  const status = loadError ?? (list ? '' : 'Loading participants…')
  return (
    <section aria-labelledby="participants-heading">
      <h2 id="participants-heading">Participants</h2>
      <BmiFilter range={{ minBmi, maxBmi }} onApply={setRange} />
      {status && <p role="status">{status}</p>}
      {list &&
        (list.total === 0 ? (
          <p>{list.filtered ? 'No participants match this BMI range.' : 'No participants yet.'}</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Date of birth</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Height</th>
                  <th scope="col">BMI</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.phone}</td>
                    <td>{p.dateOfBirth.slice(0, 10)}</td>
                    <td>
                      {p.weight} {p.weightUnit}
                    </td>
                    <td>
                      {p.height} {p.heightUnit}
                    </td>
                    <td>{p.bmi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Showing {list.offset + 1}–{list.offset + list.items.length} of {list.total}
            </p>
            {/* From the requested offset (the URL), not the page shown, so a quick second click isn't lost. */}
            <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - list.limit))}>
              Previous
            </button>{' '}
            <button type="button" disabled={offset + list.limit >= list.total} onClick={() => setOffset(offset + list.limit)}>
              Next
            </button>
          </>
        ))}
    </section>
  )
}
