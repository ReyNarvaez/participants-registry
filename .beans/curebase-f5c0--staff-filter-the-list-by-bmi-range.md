---
# curebase-f5c0
title: Staff filter the list by BMI range
status: in-progress
type: feature
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:02:55Z
updated_at: 2026-11-04T01:19:14Z
blocked_by:
    - curebase-gdl0
---

## What to build

Staff narrow the participant list to a min/max BMI range.

## Acceptance criteria

- [x] `GET /participants` accepts optional, inclusive `minBmi` / `maxBmi`, each > 0, with `minBmi <= maxBmi` when both are given; invalid values return the shared 400 shape
- [x] BMI column is indexed; filter, `total` and pagination all run in the database
- [x] UI has min/max BMI inputs and shows their validation errors
- [x] Test covers inclusive bounds and `total` reflecting the filter

## Summary of Changes

- shared: `listParticipantsQuerySchema` gains optional `minBmi` / `maxBmi`, parsed strictly as plain decimals (no `''`, exponents, spaces or arrays) and each > 0. A refine rejects min > max with an issue on `maxBmi`, so the shared 400 VALIDATION_ERROR carries `{ field: 'maxBmi' }`. Also exports `ListParticipantsQueryInput`.
- backend: `@@index([bmi])` on Participant (migration `add_participant_bmi_index`, which adds the index deferred from curebase-m9d2). `list()` builds one inclusive `where` (`bmi gte/lte`) shared by `findMany` and `count` in the existing RepeatableRead transaction, so the filter, `total` and pagination all run in the database.
- frontend: a BMI filter form (Min/Max BMI, `type="number" step="any" min="0"`, Apply/Clear) validated by `zodResolver(listParticipantsQuerySchema)`, so the rules live in shared only. Invalid ranges show field errors and send no request. Apply and Clear return to page 1, every page request carries the range, and an empty filtered result says "No participants match this BMI range."
- Tests: query schema (optional, decimals, 0/negative/non-numeric rejected, min > max on `maxBmi`, min == max allowed); a DB-backed spec in `curebase_test` covering inclusive bounds with rows just outside, single bounds, `total` reflecting the filter and filtered pagination.
- Known corner (`ponytail:` in App.tsx): a number input the browser can't parse reads as empty, so it is treated as no bound.
