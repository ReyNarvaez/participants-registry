---
# curebase-m9d2
title: Staff create a participant and see the computed BMI
status: in-progress
type: feature
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:01:23Z
updated_at: 2026-11-04T00:38:17Z
blocked_by:
    - curebase-z9be
---

## What to build

Staff fill in a participant (name, email, phone, date of birth, weight + unit, height + unit) and submit. The system computes BMI on the server and the form shows it, then clears.

## Acceptance criteria

- [x] Participant table matches the ADR 001 data model; only as-entered values + units and BMI are stored (except the `bmi` index, deferred to `curebase-f5c0`)
- [x] Shared Zod create schema holds all field rules (non-empty name, valid email, phone valid per libphonenumber-js and normalized to E.164, date of birth in the past, positive weight/height, unit enums); frontend uses it via react-hook-form + zodResolver, backend via a Zod validation pipe
- [x] Backend converts to standard units (kg, m), computes BMI = kg / m², rounds to 2 decimals; client never sends BMI
- [x] BMI conversion has one test covering each unit combination (kg/cm, kg/in, lb/cm, lb/in)
- [x] `POST /participants` returns 201 with the participant, BMI included
- [x] After success the form shows the returned BMI and clears its inputs

## Summary of Changes

- `shared`: `createParticipantSchema` (Zod) with all field rules; phone must be international format (`+` and country code), validated by libphonenumber-js and normalized to E.164; date of birth accepts `YYYY-MM-DD` or an ISO datetime and must be in the past. Transforms are idempotent, so the frontend sends parsed values and the backend re-parses them.
- `backend`: `Participant` model, `WeightUnit`/`HeightUnit` enums and unique email/phone (migration `add_participant`). The `bmi` index from the ADR data model is not added here; it is deferred to `curebase-f5c0`. `participants` module with `POST /participants`, a tiny `ZodValidationPipe` (strips unknown keys such as `bmi`), and `bmi.ts` (exact lb/in conversion, kg / m², 2 decimals). `PrismaService` is provided by `ParticipantsModule`.
- `frontend`: one-page participant form (react-hook-form + `zodResolver`, native date/number/select inputs, per-field messages) that shows the returned BMI and clears.
- Removed the health check demo (backend controller, shared exports, frontend client and its test) and the now unused frontend vitest.
- Tests: BMI across all four unit combinations; schema phone normalization, past-date rule and JSON round trip.
- Review fixes: emails are trimmed and lowercased; date of birth must be before today (UTC); measurements whose BMI is not finite and > 0 get a 400; the form shows a status when the request gets no response.
