---
# curebase-gdl0
title: Staff browse participants, newest first, with pagination
status: completed
type: feature
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:01:23Z
updated_at: 2026-11-04T01:18:40Z
blocked_by:
    - curebase-916d
---

## What to build

Below the form, staff see participants newest first and page through them. The list reloads after a successful create.

## Acceptance criteria

- [x] `GET /participants?limit=&offset=` returns `{ items, total, limit, offset }`, every item including BMI
- [x] `limit` defaults to 20 (max 100) and `offset` to 0; order is `createdAt desc, id desc`
- [x] Invalid params return the shared 400 shape
- [x] UI renders the list with paging and reloads after a create
- [x] Test covers stable pagination when timestamps collide

## Summary of Changes

- `shared`: `listParticipantsQuerySchema` (plain `z.object`; `limit` 1–100 default 20, `offset` ≥ 0 default 0, digit-only strings coerced to safe integers) plus the `Participant` (dates as ISO strings, as JSON delivers them) and `ParticipantList` wire types.
- `backend`: `GET /participants` validates the query with the existing `ZodValidationPipe` (bad params give the shared 400 VALIDATION_ERROR) and reads `findMany` (`createdAt desc, id desc`) and `count` in one repeatable-read `$transaction`.
- `frontend`: a `ParticipantList` table below the form with Previous/Next, "Showing X–Y of total", an empty state and a status message when loading fails. Previous/Next step from the requested offset, so quick clicks aren't lost. After a create it returns to the first page and re-fetches in place, keeping the old rows until the new page arrives.
- Tests: query schema (defaults, cap, rejections) and a pagination test against a dedicated `curebase_test` database on the dev Postgres (URL derived from `DATABASE_URL` in `vitest.config.ts`; a Vitest `globalSetup` runs `prisma migrate deploy`, which creates the database when missing). Dev data is untouched. It inserts 5 rows with one identical `createdAt`, pages them 2 at a time, asserts `id desc` with no duplicates or gaps, and cleans up in `afterAll`. It fails if the DB is down rather than skipping. A mutation check (`id asc`, and no tie-breaker) made it fail.
