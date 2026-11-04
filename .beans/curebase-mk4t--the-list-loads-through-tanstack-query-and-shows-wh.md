---
# curebase-mk4t
title: The list loads through TanStack Query and shows when it is busy
status: completed
type: task
priority: normal
created_at: 2026-11-04T22:23:02Z
updated_at: 2026-11-04T22:32:31Z
---

## What to build

ADR 002 › Server state and the list: TanStack Query for the list and for creating participants, and the loading UX.

## Acceptance criteria

- [x] lib/query-client creates the QueryClient (retries off); AppLayout provides it, so the real routes carry it in tests
- [x] features/participants/queries.ts: useParticipants keeps the previous page on screen while the next loads; useCreateParticipant invalidates the list on success
- [x] After a save the list shows page 1 (range kept); the hand-rolled saved.ts signal is deleted
- [x] While a page staff asked for loads, a spinner covers the current rows, the list is aria-busy, and Apply, Clear, Previous and Next are disabled; Save stays disabled while saving
- [x] Page-level tests pass; new tests pin the busy state

## Summary of Changes

- `lib/query-client.ts`: the QueryClient (retries off; queries that throw a non-AppError are logged). `AppLayout` provides one per mounted app, so the real routes carry it in tests.
- `features/participants/queries.ts`: `useParticipants` (placeholder data keeps the previous page on screen; TanStack's abort signal cancels a page left before it arrives) and `useCreateParticipant` (invalidates every cached page on success). `saved.ts` is deleted.
- After a successful save the form moves the list to page 1 through the URL (`firstPage`, which reads the URL at that moment, so it is safe after the await), as decided in the grilling. URL cleanup runs once, in the list (`useDropInvalidListParams`).
- Loading: while a page staff asked for loads (placeholder data), a `Busy` overlay with a spinner ("Loading participants") covers the rows or the empty state, the list region is `aria-busy`, and Apply, Clear, Previous and Next are disabled. Background refetches (window focus, after a save) hold nothing. Save stays disabled while saving.
- `lib/api-client.ts`: requests take an optional signal plus a 15 s timeout (a hung request ends as UNAVAILABLE instead of holding the list); `asAppError` maps anything unexpected to the generic catalog message for both form and list.
- A failed load keeps the last rows and the paging controls, so staff can go back.
- Tests: 23 page-level tests. New: the busy state, a failed page keeping the previous rows, and the re-fetch after a save holding nothing. Each was checked by breaking what it covers.
