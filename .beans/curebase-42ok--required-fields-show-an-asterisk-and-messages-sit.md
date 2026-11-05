---
# curebase-42ok
title: Required fields show an asterisk, and messages sit beside the label
status: completed
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-05T02:39:15Z
updated_at: 2026-11-05T02:39:15Z
---

## What to build

A field the form's schema requires shows an asterisk after its label, and its error or warning appears on the label's row rather than under the input. Which fields are required is read from the shared schema the form already validates with, never listed by hand, so the asterisk can't drift from the rules.

## Acceptance criteria

- [x] Every new-participant field is marked required (all six are required by `createParticipantSchema`); the BMI bounds are not (optional in `listParticipantsQuerySchema`)
- [x] Required comes from the schema (a field is required when the schema doesn't accept it missing); a schema change moves the asterisk with no UI edit
- [x] The asterisk is hidden from screen readers; the input is marked `aria-required` instead
- [x] The error or warning sits beside the label, keeps its live-region announcement and still describes the input (`aria-describedby`)
- [x] The phone error is shortened to fit beside the label: "Enter a valid phone number, e.g. +14155552671" (review: "Use international format" was wrong for an invalid +44 number)
- [x] An invalid field keeps its red border (already driven by `aria-invalid`)
- [x] Page tests: asterisk/aria-required on a required field and not on an optional one; message still announced and describing its input

## Summary of Changes

- `frontend/src/lib/required-fields.ts`: `requiredFields(shape)` maps each schema field to whether it is rejected when missing (optional or defaulted fields pass). Both forms read it from their shared schema and pass `required` to each `Field`.
- `Field`: `required` shows an `aria-hidden` red asterisk beside the label and sets `aria-required` on the control. The error (`role="alert"`) and the warning (polite live region) sit on the label row, which keeps a one-line minimum height so the input does not jump; both still describe the control.
- Both forms line fields up by their bottom (`items-end`), so a message wrapping in a narrow field (BMI bounds) or a mid-width column keeps inputs and the Apply/Clear buttons level.
- `shared`: phone message shortened to "Enter a valid phone number, e.g. +14155552671".
- Tests: asterisk and `aria-required` on the six participant fields and not on the BMI bounds, the mark outside the accessible name; phone message as an alert describing its input. Derivation checked by breaking it. Seen in a real browser at 1100px and 800px.
- Review findings declined: deriving `required` inside `Field` from a schema plus name (couples generic UI to Zod; one prop per field reads from the schema); `requiredFields` parsing `undefined` while text inputs submit `''` (right for every current field, since optional bounds map `''` to `undefined`); a field schema that throws on `undefined` (none does); Zod's own types/`isOptional` (frontend has no direct zod dependency); page-wide asterisk count.
