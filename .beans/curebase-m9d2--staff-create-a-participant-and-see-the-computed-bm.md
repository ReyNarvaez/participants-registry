---
# curebase-m9d2
title: Staff create a participant and see the computed BMI
status: todo
type: feature
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:01:23Z
updated_at: 2026-11-04T00:02:55Z
blocked_by:
    - curebase-z9be
---

## What to build

Staff fill in a participant (name, email, phone, date of birth, weight + unit, height + unit) and submit. The system computes BMI on the server and the form shows it, then clears.

## Acceptance criteria

- [ ] Participant table matches the ADR 001 data model; only as-entered values + units and BMI are stored
- [ ] Shared Zod create schema holds all field rules (non-empty name, valid email, phone valid per libphonenumber-js and normalized to E.164, date of birth in the past, positive weight/height, unit enums); frontend uses it via react-hook-form + zodResolver, backend via a Zod validation pipe
- [ ] Backend converts to standard units (kg, m), computes BMI = kg / m², rounds to 2 decimals; client never sends BMI
- [ ] BMI conversion has one test covering each unit combination (kg/cm, kg/in, lb/cm, lb/in)
- [ ] `POST /participants` returns 201 with the participant, BMI included
- [ ] After success the form shows the returned BMI and clears its inputs
