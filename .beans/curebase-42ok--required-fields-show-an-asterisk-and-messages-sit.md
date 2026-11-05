---
# curebase-42ok
title: Required fields show an asterisk, and messages sit beside the label
status: todo
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-05T02:39:15Z
updated_at: 2026-11-05T02:39:15Z
---

## What to build

A field the form's schema requires shows an asterisk after its label, and its error or warning appears on the label's row rather than under the input. Which fields are required is read from the shared schema the form already validates with, never listed by hand, so the asterisk can't drift from the rules.

## Acceptance criteria

- [ ] Every new-participant field is marked required (all six are required by `createParticipantSchema`); the BMI bounds are not (optional in `listParticipantsQuerySchema`)
- [ ] Required comes from the schema (a field is required when the schema doesn't accept it missing); a schema change moves the asterisk with no UI edit
- [ ] The asterisk is hidden from screen readers; the input is marked `aria-required` instead
- [ ] The error or warning sits beside the label, keeps its live-region announcement and still describes the input (`aria-describedby`)
- [ ] The phone error is shortened to fit beside the label: "Use international format, e.g. +14155552671"
- [ ] An invalid field keeps its red border (already driven by `aria-invalid`)
- [ ] Page tests: asterisk/aria-required on a required field and not on an optional one; message still announced and describing its input
