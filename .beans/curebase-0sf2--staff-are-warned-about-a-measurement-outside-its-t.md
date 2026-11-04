---
# curebase-0sf2
title: Staff are warned about a measurement outside its typical range
status: completed
type: feature
priority: normal
created_at: 2026-11-04T22:33:00Z
updated_at: 2026-11-04T22:42:27Z
---

## What to build

ADR 002 › Typical ranges for measurements: a non-blocking warning when a weight or height is outside its typical range, to catch unit slips. No hard range; the server keeps only its usable-BMI check.

## Acceptance criteria

- [x] shared/src/units.ts converts kg/lb and cm/in to standard units; backend bmi() uses it
- [x] Typical ranges are named constants in standard units in shared (weight 30-250 kg, height 1.20-2.20 m), with predicates per unit
- [x] The form warns under weight or height once staff left the field; changing the unit re-checks at once
- [x] The warning never blocks a save, never marks the field invalid, is announced politely and describes its input
- [x] The warning colour is a theme token

## Summary of Changes

- shared: `units.ts` (`weightUnits`, `heightUnits`, `toKg`, `toMetres`), used by the participant schema's unit enums and by backend `bmi()` (same arithmetic; its exact-value tests pass). `schemas/participant.ts` adds `typicalRange` (weight 30–250 kg, height 1.20–2.20 m, inclusive, standard units, commented as rough adult values) and `isTypicalWeight` / `isTypicalHeight`.
- frontend: `Field` gains a `warning` slot in an always-mounted polite live region that describes the input (an error takes its place; the field is never marked invalid). The form shows "Unusual weight/height: check the unit" once staff left the field, re-checking when the unit changes, for values the schema accepts. A warning never blocks a save. The amber `warning` colour is a theme token in `index.css`.
- Tests: boundary cases per unit (`backend/src/participants/typical-range.spec.ts`, beside the other shared-schema specs), and page tests for a unit slip flagged until fixed (polite region, aria-describedby, not invalid), an unusual weight saved anyway, no flag while typing but one after leaving, and none while typing after a failed save. Checked by breaking each behaviour. Seen in a real browser.
- Review finding declined: moving the watch into per-field components to avoid re-renders (six inputs; react-hook-form already re-renders per keystroke after a failed submit).
- Not run before merging: the two database-backed backend suites (participants.service, app.module). Docker Desktop's engine stopped responding mid-ticket. This ticket changes only `bmi()`'s internals there, covered by the database-free specs (65 pass). Run `pnpm test` once Docker is back.
