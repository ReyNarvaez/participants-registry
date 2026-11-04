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

- [ ] `shared` exports the error codes and the response shape `{ error: { code, message, details?: { field, message }[] } }`
- [ ] A global exception filter maps: Zod errors to 400 `VALIDATION_ERROR` with `details`; Prisma unique violations to 409 `EMAIL_TAKEN` / `PHONE_TAKEN`; anything else to 500 `INTERNAL_ERROR`
- [ ] Uniqueness relies on the DB unique constraints only (no check-then-insert)
- [ ] The form puts each `details[].field` message, and the 409 codes, on the matching input
- [ ] One test per mapping (400, 409 email, 409 phone, 500)
