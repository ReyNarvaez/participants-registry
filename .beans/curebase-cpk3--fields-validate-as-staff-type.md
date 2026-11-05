---
# curebase-cpk3
title: Fields validate as staff type
status: todo
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-05T02:39:15Z
updated_at: 2026-11-05T02:39:15Z
---

## What to build

Both forms (new participant and BMI filter) check a field when staff leave it, then re-check it on every keystroke until it is valid. Today nothing shows until Save or Apply is clicked.

## Acceptance criteria

- [ ] Leaving an invalid field shows its error at once, without submitting
- [ ] Typing in a field that shows an error re-checks it per keystroke, and the error clears as soon as the value is valid
- [ ] A field staff have not touched shows no error until submit
- [ ] Typical-range warnings keep their current timing (shown after leaving the field)
- [ ] Page tests cover leave-then-error and fix-then-clear for both forms
