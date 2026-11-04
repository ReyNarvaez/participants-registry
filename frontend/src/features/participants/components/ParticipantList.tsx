import { useEffect, useState } from 'react'
import { AppError, appError } from '@curebase/shared'
import { ChevronLeft, ChevronRight, CircleAlert, Users } from 'lucide-react'
import { Busy } from '@/components/Busy'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useListParams } from '../list-params'
import { useLastSaveTime, useParticipants } from '../queries'
import { BmiFilter } from './BmiFilter'

/**
 * Newest first, one page at a time, filterable by BMI. Its page and range live in the URL (useListParams);
 * the rows shown stay, under a spinner, until the requested page arrives. After a save it shows page 1.
 */
export function ParticipantList() {
  const { params, setOffset, setRange, firstPage } = useListParams()
  const { offset, minBmi, maxBmi } = params
  // `list.query` is what produced the rows on screen (the previous page, while the next one loads).
  const { data: list, error, isFetching } = useParticipants(params)
  const loadError =
    error && `Could not load participants (${(error instanceof AppError ? error : appError.internal()).message})`

  // After a save the newest participant is on page 1 (the range stays); invalidation re-fetches the page in place.
  const lastSave = useLastSaveTime()
  const [seenSave, setSeenSave] = useState(lastSave)
  useEffect(() => {
    if (lastSave <= seenSave) return
    setSeenSave(lastSave)
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
    <Card aria-labelledby="participants-heading" role="region" aria-busy={isFetching}>
      <CardHeader>
        <CardTitle>
          <h2 id="participants-heading">Participants</h2>
        </CardTitle>
        <CardDescription>Newest first. Filter by BMI to find participants in a range.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BmiFilter range={{ minBmi, maxBmi }} onApply={setRange} disabled={isFetching} />
        {loadError && (
          // Polite: a failed load shouldn't interrupt; it can repeat on every page or filter change while offline.
          <Alert variant="destructive" role="status">
            <CircleAlert />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {!list && !loadError && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner role="none" aria-hidden="true" />
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
              <Busy busy={isFetching} label="Loading participants">
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
                          <TableCell className="font-medium whitespace-normal">
                            {p.name}
                            {/* Narrow screens hide these columns, so the details move under the name. */}
                            <span className="block text-xs font-normal text-muted-foreground md:hidden">
                              <span className="block [overflow-wrap:anywhere]">{p.email}</span>
                              <span className="block">{p.phone}</span>
                              <span className="block whitespace-nowrap">Born {p.dateOfBirth.slice(0, 10)}</span>
                            </span>
                          </TableCell>
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
              </Busy>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground tabular-nums">
                  Showing {list.offset + 1}–{list.offset + list.items.length} of {list.total}
                </p>
                {/* From the requested offset (the URL); disabled while a page loads, so clicks can't race. */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetching || offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - list.limit))}
                  >
                    <ChevronLeft aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetching || offset + list.limit >= list.total}
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
