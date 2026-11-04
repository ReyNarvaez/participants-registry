---
# curebase-hrwd
title: Backend features talk to the database only through a DAL
status: completed
type: task
priority: normal
created_at: 2026-11-04T21:59:14Z
updated_at: 2026-11-04T22:04:05Z
---

## What to build

ADR 002 › Backend layout: generic code in backend/src/common, a BaseDal with paginate() and uniqueFields(), and a participants DAL that is the only Prisma user. Uniqueness leaves the global error filter.

## Acceptance criteria

- [x] common/ holds the error filter, the zod pipe, a global Prisma module and BaseDal
- [x] BaseDal has protected paginate() (page + total in one RepeatableRead transaction) and uniqueFields() (violated unique index -> its AppError, prototype-safe); no generic CRUD
- [x] participants.dal.ts is the only file under participants/ that touches Prisma; the service holds the rules (bmi) and the controller only HTTP
- [x] The error filter no longer knows any entity or Prisma
- [x] Duplicate email and phone are tested by real inserts through the service against curebase_test; the forged Prisma error is gone
- [x] A test proves the Nest module graph resolves (DI wiring)

## Summary of Changes

- backend/src/common: `error.filter.ts`, `zod-validation.pipe.ts` (moved), `prisma/prisma.service.ts` (moved) with a global `PrismaModule` so every DAL shares one client, and `dal/base.dal.ts`: abstract `BaseDal` with protected `paginate()` (page + total in one RepeatableRead transaction) and `uniqueFields()` (a violated unique index listed by the subclass becomes its AppError, prototype-safe via `Object.hasOwn`; anything else is rethrown). No generic CRUD.
- participants: `participants.dal.ts` is the only Prisma user and maps `Participant_email_key` / `Participant_phone_key`; the service computes BMI and calls the DAL; the controller does HTTP only. The error filter no longer knows Prisma or any entity.
- No DTO files: request types come straight from the shared schemas (review finding; ADR 002 updated to say so).
- Tests: duplicate email and phone by real inserts through the service against curebase_test (the forged Prisma error is gone), BMI stored by create, `uniqueFields` unlisted / prototype-named / non-Prisma failures, and a test that the Nest module graph resolves. Every DB suite now clears all test prefixes first. Each new test was checked by breaking what it covers.
- Review findings declined: wrapping every write automatically (a write outside `uniqueFields` returning 500 is the design, and an index rename fails the real-insert tests); a `meta.target` fallback (Prisma 7 always goes through the pg adapter, and the real-insert tests fail loudly if the shape moves).
