---
# curebase-916d
title: Invalid or duplicate input shows field-level errors
status: in-progress
type: feature
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:01:23Z
updated_at: 2026-11-04T00:51:54Z
blocked_by:
    - curebase-m9d2
---

## What to build

When staff submit bad input or a duplicate email/phone, the API answers with the one shared error shape and the form shows each message on the matching field.

## Acceptance criteria

- [x] `shared` exports the error codes and the response shape `{ error: { code, message, details?: { field, message }[] } }`
- [x] A global exception filter maps: Zod errors to 400 `VALIDATION_ERROR` with `details`; Prisma unique violations to 409 `EMAIL_TAKEN` / `PHONE_TAKEN`; anything else to 500 `INTERNAL_ERROR`
- [x] Uniqueness relies on the DB unique constraints only (no check-then-insert)
- [x] The form puts each `details[].field` message, and the 409 codes, on the matching input
- [x] One test per mapping (400, 409 email, 409 phone, 500)

## Summary of Changes

- `shared`: `errorStatus` (codes → HTTP status), `ErrorCode`, `ErrorResponse`.
- `backend/src/error.filter.ts`: global `@Catch()` filter (registered in `main.ts`). ZodError → 400 `VALIDATION_ERROR` with `details` (path joined by `.`); P2002 → 409 `EMAIL_TAKEN`/`PHONE_TAKEN`, keyed on `meta.driverAdapterError.cause.constraint.index` (the pg driver adapter shape, not `meta.target`); Nest's own 4xx keep their status (404 → `NOT_FOUND`, others → `VALIDATION_ERROR`); anything else is logged and returned as a bare 500 `INTERNAL_ERROR`.
- `ZodValidationPipe` now just calls `schema.parse`, so the ZodError reaches the filter.
- `bmi.ts` throws a ZodError with issues on `weight` and `height`, so the guard is a 400 the form can show.
- `frontend/src/App.tsx`: `fieldErrors()` puts 409s on email/phone and `details[]` on their inputs via `setError`; anything else is a status line.
- Deviation from ADR: added `NOT_FOUND` (404) so unknown routes keep their status.
