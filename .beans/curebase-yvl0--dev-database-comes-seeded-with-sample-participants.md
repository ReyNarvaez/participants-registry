---
# curebase-yvl0
title: Dev database comes seeded with sample participants
status: completed
type: task
priority: normal
created_at: 2026-11-04T20:02:20Z
updated_at: 2026-11-04T20:06:40Z
---

## What to build

A first-time setup ends with a migrated database that already holds sample participants, without extra commands.

## Acceptance criteria

- [x] A seed script inserts sample participants that pass the same rules as a staff-entered one (shared create schema + server-computed BMI)
- [x] Re-running the seed never duplicates rows or touches existing ones
- [x] `pnpm dev` applies migrations and seeds before starting the apps, so a fresh clone needs only `pnpm install` and `pnpm dev`
- [x] The test database (curebase_test) is never seeded
- [x] Enough rows (> 20) and a BMI spread to see paging and the BMI filter work

## Summary of Changes

- backend: `prisma/seed.ts` inserts 25 fictional participants (mixed units, BMI about 17 to 38). Each row is parsed by `createParticipantSchema` and gets the server `bmi()`, so it obeys the staff-entry rules. Phones use the 555-0100 to 555-0199 fiction range. `createMany({ skipDuplicates: true })` makes re-runs a no-op that never overwrites; the log reports skipped rows. Fixed `createdAt` timestamps keep seed rows below staff entries. Registered as `migrations.seed` (`tsx prisma/seed.ts`) in `prisma.config.ts`; `tsx` added as a dev dependency.
- root: new `db:setup` (build shared, `prisma migrate deploy`, `prisma db seed`), run by `pnpm dev` before the apps start.
- backend postinstall copies `.env.example` to `.env` when missing, so a fresh clone needs only `pnpm install` and `pnpm dev`.
- Not seeded: `curebase_test` (its global setup only runs `migrate deploy`).
- Review findings declined: gating `pnpm dev` on `migrate deploy` (an unmigrated DB is broken anyway, so failing loudly is right); extracting a helper for the one-line `{ ...participant, bmi }` spread (shallow); the ~4 s setup on each `pnpm dev` (the cost of seeding automatically).
