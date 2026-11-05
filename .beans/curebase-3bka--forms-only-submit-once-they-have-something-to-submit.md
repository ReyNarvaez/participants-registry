---
# curebase-3bka
title: Forms only submit once they have something to submit
status: completed
type: feature
tags:
    - ready-for-agent
created_at: 2026-11-05T02:39:15Z
updated_at: 2026-11-05T02:39:15Z
---

## What to build

Apply on the BMI filter is disabled while both bounds are empty (Clear still removes an applied range). Save participant stays enabled: clicking it with a required field empty sends nothing and shows each missing field's error. The schema validation already blocks that submit today; this ticket pins it with a test.

## Acceptance criteria

- [x] Apply is disabled while Min BMI and Max BMI are both empty and no range is applied, and enabled once either has text (review: emptied bounds of an applied range must still apply, to remove it)
- [x] Apply stays disabled while the list loads (current behaviour), and Clear is unaffected
- [x] Save participant is never disabled for missing input (only while saving, as today)
- [x] Save with any schema-required field empty sends no request, and every empty required field shows its error and is marked invalid
- [x] Page tests cover Apply enabling/disabling and an empty Save sending no request

## Summary of Changes

- `BmiFilter`: Apply is disabled while both bounds are empty and no range is applied (plus while the list loads, as before). With a range applied, emptying the bounds and pressing Apply or Enter still removes it. Clear is unchanged.
- Save participant: unchanged. The schema already blocks a submit with required fields empty; a page test now pins that no request is sent and every empty required field is flagged.
- Tests: Apply enabling and disabling on a blank form; a range from a link (Apply enabled, emptied bounds remove it); empty Save sends nothing. The re-fetch-after-save test types a bound so it still checks Apply is not held.
- Review findings declined: a disabled Apply being skipped by Tab and Enter with no hint (asked for; Clear stays available and the bounds are visibly optional); whitespace-only input enabling Apply (the schema's error explains it).
