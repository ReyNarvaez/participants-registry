import { useEffect, useState } from 'react'
import { AppError, appError, type ParticipantList as ParticipantListResponse } from '@curebase/shared'
import { ChevronLeft, ChevronRight, CircleAlert, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listParticipants } from '../api'
import { useListParams, type ListParams } from '../list-params'
import { useParticipantSaves } from '../saved'
import { BmiFilter } from './BmiFilter'

/**
 * Newest first, one page at a time, filterable by BMI. Its page and range live in the URL (useListParams);
 * the rows shown stay until the requested page arrives. After a save it re-fetches and shows page 1.
 */
export function ParticipantList() {
  const { params, setOffset, setRange, firstPage } = useListParams()
  const { offset, minBmi, maxBmi } = params
  // `query` records what produced this page, so the empty message and the past-the-end check match the rows on screen.
  const [list, setList] = useState<ParticipantListResponse & { query: ListParams }>()
  const [loadError, setLoadError] = useState<string>()
  const saves = useParticipantSaves()
  const [seenSaves, setSeenSaves] = useState(saves)

  useEffect(() => {
    let current = true // ignore a response that lands after a newer request
    listParticipants({ offset, minBmi, maxBmi }).then(
      (page) => {
        if (!current) return
        setList({ ...page, query: { offset, minBmi, maxBmi } })
        setLoadError(undefined)
      },
      (error: unknown) => {
        // A bug, not a failed request: keep it visible, but still answer the user.
        if (!(error instanceof AppError)) console.error(error)
        if (current) setLoadError(`Could not load participants (${(error instanceof AppError ? error : appError.internal()).message})`)
      },
    )
    return () => {
      current = false
    }
  }, [offset, minBmi, maxBmi, saves])

  // After a save the newest participant is on page 1 (the range stays); the fetch above re-runs in place.
  useEffect(() => {
    if (saves === seenSaves) return
    setSeenSaves(saves)
    if (offset !== 0) firstPage(true)
  })

  // A stale link, or a list that shrank, can point past the last page: show page 1 instead of an empty page.
  const shown = list?.query
  const pastTheEnd =
    list !== undefined && shown?.offset === offset && shown.minBmi === minBmi && shown.maxBmi === maxBmi && offset > 0 && offset >= list.total
  useEffect(() => {
    if (pastTheEnd) firstPage(true)
  })

  const filtered = list !== undefined && (list.query.minBmi !== undefined || list.query.maxBmi !== undefined)
  return (
    <Card aria-labelledby="participants-heading" role="region">
      <CardHeader>
        <CardTitle>
          <h2 id="participants-heading">Participants</h2>
        </CardTitle>
        <CardDescription>Newest first. Filter by BMI to find participants in a range.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BmiFilter range={{ minBmi, maxBmi }} onApply={setRange} />
        {loadError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {!list && !loadError && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading participants…
          </p>
        )}
        {list &&
          (list.total === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <Users className="size-6" aria-hidden="true" />
              <p>{filtered ? 'No participants match this BMI range.' : 'No participants yet.'}</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      {/* Narrow screens keep name, measurements and BMI; contact details and birth date need room. */}
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Date of birth</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Height</TableHead>
                      <TableHead className="text-right">BMI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.items.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium whitespace-normal">{p.name}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{p.email}</TableCell>
                        <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">{p.phone}</TableCell>
                        <TableCell className="hidden tabular-nums md:table-cell">{p.dateOfBirth.slice(0, 10)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.weight} {p.weightUnit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.height} {p.heightUnit}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{p.bmi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground tabular-nums">
                  Showing {list.offset + 1}–{list.offset + list.items.length} of {list.total}
                </p>
                {/* From the requested offset (the URL), not the page shown, so a quick second click isn't lost. */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - list.limit))}
                  >
                    <ChevronLeft aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + list.limit >= list.total}
                    onClick={() => setOffset(offset + list.limit)}
                  >
                    Next
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          ))}
      </CardContent>
    </Card>
  )
}
