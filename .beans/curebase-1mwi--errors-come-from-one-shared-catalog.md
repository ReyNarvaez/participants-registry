---
# curebase-1mwi
title: Errors come from one shared catalog
status: completed
type: task
priority: normal
created_at: 2026-11-04T21:54:05Z
updated_at: 2026-11-04T21:59:04Z
---

## What to build

ADR 002 › Errors and Shared layout: one error catalog and AppError in shared, used by the backend and the frontend; shared schemas move to schemas/participant.ts.

## Acceptance criteria

- [x] shared/src/schemas/participant.ts holds the participant schemas and types; shared/src/errors.ts holds errorCatalog, AppError and appError; index.ts re-exports both
- [x] appError has one method per catalog entry, each returning a fresh AppError
- [x] Every response's status and message come from the catalog; Nest's malformed-JSON message is no longer echoed
- [x] The zod pipe throws appError.validation(details); bmi() throws appError.bmiUnusable(); ValidationError is deleted
- [x] The frontend rebuilds AppError from responses (UNAVAILABLE for no response or no shared body) and maps catalog fields and details onto form fields; takenField is deleted
- [x] Backend and frontend tests pass; page-level tests change only where ADR 002 changes behaviour

## Summary of Changes

- shared: `schemas/participant.ts` (moved unchanged from `index.ts`) and `errors.ts` with `errorCatalog` (keyed by method name, each entry carrying its code, status, message and fixed fields), `AppError` (`status`, `fieldErrors()`, `toResponse()`, `fromResponse()`) and `appError`, generated from the catalog, one method per entry returning a fresh error. `fromResponse` accepts only the shared shape with a known code (prototype keys included) and drops malformed details; anything else is UNAVAILABLE.
- backend: `ValidationError` deleted. The zod pipe throws `appError.validation(details)`; `bmi()` throws `appError.bmiUnusable()`. The filter answers with the catalog status and message only: Nest's 404 is NOT_FOUND, every other Nest 4xx (malformed JSON, body too large) is a 400 VALIDATION_ERROR without echoing the message (the malformed-JSON one quotes the body), and a client-only AppError thrown on the server is a logged 500. The P2002 table stays in the filter until curebase-hrwd (backend DAL) moves it.
- frontend: `takenField` deleted; the form reads `AppError.fieldErrors()` (catalog fields or details), keeping only fields it has.
- Tests: filter spec covers BMI_UNUSABLE, catalog messages for Nest errors (no echo), 413 as 400, a client-only code as 500. New page test: a code-only BMI_UNUSABLE body puts the catalog message on weight and height. Page tests otherwise unchanged.
- Review findings declined: keeping each Nest 4xx status (ADR 002 maps unreadable requests to 400; auth will add its own codes); narrowing the list's catch (done properly by the frontend api-client ticket); typing client-only codes out of ErrorResponse (the runtime fallback covers it). Uniqueness moving out of the filter, with a prototype-safe lookup, is the next ticket.
