---
# curebase-cpk3
title: Fields validate as staff type
status: completed
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-05T02:39:15Z
updated_at: 2026-11-05T02:39:15Z
---

## What to build

Both forms (new participant and BMI filter) check a field when staff leave it, then re-check it on every keystroke until it is valid. Today nothing shows until Save or Apply is clicked.

## Acceptance criteria

- [x] Leaving an invalid field shows its error at once, without submitting
- [x] Typing in a field that shows an error re-checks it per keystroke, and the error clears as soon as the value is valid
- [x] A field staff have not touched shows no error until submit
- [x] Typical-range warnings keep their current timing (shown after leaving the field)
- [x] Page tests cover leave-then-error and fix-then-clear for both forms

## Summary of Changes

- Both forms validate with react-hook-form's `onTouched` mode: a field is checked when staff leave it, then on every keystroke until valid.
- Weight/height no longer use `deps` (it flagged the untouched partner on blur). Each re-checks the other only while that one shows an error, so fixing either still clears a server BMI error on both (now pinned by a test).
- Min BMI has `deps: ['maxBmi']`: the schema's min ≤ max refine puts its error on Max, so fixing Min clears it (review finding).
- Tests: leave-then-error and fix-then-clear for both forms, untouched partner left alone, BMI error cleared from either side, Min fix clears Max's range error. Each checked by breaking the behaviour.
- Review findings declined: unit change not re-checking a server BMI error, and a re-check clearing a server BMI error the new pair would still trigger (both pre-existing with `deps`; the server re-checks on save); a shared re-check helper (one caller left); a one-frame error flash when leaving an invalid bound to click Clear.
