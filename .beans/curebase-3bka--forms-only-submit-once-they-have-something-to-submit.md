---
# curebase-3bka
title: Forms only submit once they have something to submit
status: todo
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-05T02:39:15Z
updated_at: 2026-11-05T02:39:15Z
---

## What to build

Apply on the BMI filter is disabled while both bounds are empty (Clear still removes an applied range). Save participant stays enabled: clicking it with a required field empty sends nothing and shows each missing field's error. The schema validation already blocks that submit today; this ticket pins it with a test.

## Acceptance criteria

- [ ] Apply is disabled while Min BMI and Max BMI are both empty, and enabled once either has text
- [ ] Apply stays disabled while the list loads (current behaviour), and Clear is unaffected
- [ ] Save participant is never disabled for missing input (only while saving, as today)
- [ ] Save with any schema-required field empty sends no request, and every empty required field shows its error and is marked invalid
- [ ] Page tests cover Apply enabling/disabling and an empty Save sending no request
