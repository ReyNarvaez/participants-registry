---
# curebase-8ysv
title: Frontend has page-level tests that pin today's behaviour
status: completed
type: task
priority: normal
created_at: 2026-11-04T21:48:40Z
updated_at: 2026-11-04T21:53:57Z
---

## What to build

A minimal frontend test harness and page-level tests, so the refactors in the following tickets can prove they keep behaviour (ADR 002 › Testing).

## Acceptance criteria

- [x] vitest + jsdom + Testing Library + user-event in frontend; `pnpm test` at the root runs them
- [x] Tests render the real App with a stubbed fetch and act like staff (by role and label, not markup)
- [x] Covered: save shows the BMI and reloads the list on page 1; a 409 puts its message on the email field; a 400 puts details on their fields; applying a BMI range sends minBmi/maxBmi from page 1; Next/Previous request the right offset
- [x] No component- or hook-level tests

## Summary of Changes

- frontend: vitest 4 (matching the backend) with jsdom, Testing Library and user-event; `test` script, so the root `pnpm test` runs it. `vite.config.ts` now uses `vitest/config` with `environment: 'jsdom'`.
- `src/App.test.tsx`: 10 page-level tests that render the page through one `renderPage()` helper (StrictMode, as in main.tsx) with only `fetch` stubbed by a small fake server. Covered: save shows the BMI, clears the form and reloads page 1; EMAIL_TAKEN / PHONE_TAKEN on their fields; server validation details on their fields, with details for unknown fields dropped; BMI range from page 1, kept while paging, Clear empties the inputs; Next/Previous at both ends; both empty states; a failed list load; a save with no response or with a non-JSON error body.
- Each new behaviour assertion was checked by breaking the code it pins and watching the matching test fail.
- Review finding declined: pinning "a quick second click isn't lost", which ADR 002 replaces by disabling the paging buttons while a page loads.
