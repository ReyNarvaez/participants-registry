---
# curebase-yvl0
title: Dev database comes seeded with sample participants
status: in-progress
type: task
created_at: 2026-11-04T20:02:20Z
updated_at: 2026-11-04T20:02:20Z
---

## What to build

A first-time setup ends with a migrated database that already holds sample participants, without extra commands.

## Acceptance criteria

- [ ] A seed script inserts sample participants that pass the same rules as a staff-entered one (shared create schema + server-computed BMI)
- [ ] Re-running the seed never duplicates rows or touches existing ones
- [ ] `pnpm dev` applies migrations and seeds before starting the apps, so a fresh clone needs only `pnpm install` and `pnpm dev`
- [ ] The test database (curebase_test) is never seeded
- [ ] Enough rows (> 20) and a BMI spread to see paging and the BMI filter work
