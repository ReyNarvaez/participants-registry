---
# curebase-sfzt
title: Frontend is layered, routed, and keeps the list in the URL
status: completed
type: task
priority: normal
created_at: 2026-11-04T22:04:59Z
updated_at: 2026-11-04T22:13:28Z
---

## What to build

ADR 002 › Frontend layout and the URL parts of Server state and the list: app/pages/features/components/lib layers, React Router, an API client, and the list's page and BMI range in validated URL params.

## Acceptance criteria

- [x] app/ (App, routes, layout), pages/ (ParticipantsPage, NotFoundPage), features/participants/ (components, api.ts, list params), components/ (Field), lib/ (api-client, form-errors); imports point downward only
- [x] React Router v7: / redirects to /participants, any other path shows a not-found page; tests use a memory router built from the same routes
- [x] lib/api-client turns only fetch and JSON failures into UNAVAILABLE; server errors become their AppError
- [x] Offset and BMI range live in the URL: shareable, Back/Forward work; invalid params are dropped; an offset past the end goes back to page 1
- [x] Existing page-level tests pass with only the render helper changed

## Summary of Changes

- frontend/src: `app/` (App with the browser router, `routes.tsx`, `AppLayout`), `pages/` (ParticipantsPage, NotFoundPage), `features/participants/` (components ParticipantForm, ParticipantList, BmiFilter; `api.ts`; `list-params.ts`; `saved.ts`), `components/Field.tsx`, `lib/api-client.ts` and `lib/form-errors.ts`. Imports point downward only (checked by grep). `App.tsx` is gone.
- React Router 7: `/` redirects to `/participants` keeping its query; any other path shows NotFoundPage. Tests build a memory router from the same routes.
- `lib/api-client.request()` catches only fetch and JSON failures (UNAVAILABLE); a failed response becomes its AppError. Callers treat any other thrown value as a bug: logged, and answered with the generic catalog message.
- The list's offset and BMI range live in the URL (`useListParams`): each param must pass the shared query schema on its own and a min above max drops both bounds, invalid params are never requested and are removed from the URL; an offset past the end of the same query shows page 1. The BMI inputs follow the URL (e.g. on Back).
- After a save, `saved.ts` (a small feature-internal signal, marked `ponytail:`) tells the list, which re-fetches in place and moves to page 1, keeping the range, its rows and any typed filter text. TanStack Query's mutation state replaces it in the next tickets.
- Also on this branch: `pnpm-workspace.yaml` allows esbuild's install script. pnpm 12 failed `pnpm install` on it since tsx (curebase-yvl0) and vitest arrived.
- Tests: 20 page-level tests; the original 11 pass with only the render helper changed. New: a shared link, Back, invalid params (3 cases), a stale offset, routes and the redirect keeping its query, a save on page 1 re-fetching in place, typed filter text surviving a save. Each was checked by breaking what it covers.
- Review finding declined: treating 204 as success in the api-client (no endpoint returns one yet).
