---
# curebase-f5c0
title: Staff filter the list by BMI range
status: todo
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-04T00:02:55Z
updated_at: 2026-11-04T00:02:55Z
blocked_by:
    - curebase-gdl0
---

## What to build

Staff narrow the participant list to a min/max BMI range.

## Acceptance criteria

- [ ] `GET /participants` accepts optional, inclusive `minBmi` / `maxBmi`, each > 0, with `minBmi <= maxBmi` when both are given; invalid values return the shared 400 shape
- [ ] BMI column is indexed; filter, `total` and pagination all run in the database
- [ ] UI has min/max BMI inputs and shows their validation errors
- [ ] Test covers inclusive bounds and `total` reflecting the filter
