---
# curebase-301h
title: 'ADR 002: architecture after the deepening review'
status: completed
type: task
priority: normal
created_at: 2026-11-04T21:40:18Z
updated_at: 2026-11-04T21:48:22Z
---

## What to build

Record the decisions from the architecture review and grilling session as ADR 002, and mark ADR 001 as partly superseded.

## Acceptance criteria

- [x] docs/adrs/002 records each decision with its reason and the rejected alternatives worth remembering
- [x] ADR 001 status and the superseded sections point to ADR 002
- [x] GLOSSARY.md gains the domain terms the decisions introduce

## Summary of Changes

- docs/adrs/002: error catalog and `appError`, typical ranges (warning only, standard units, adult-tuned) with the usable-BMI check kept, shared/backend/frontend layouts with `BaseDal`, React Router, TanStack Query, list state in the URL (validated), shadcn/ui on Tailwind with one theme, offset paging kept on purpose, page- and service-level testing, known gaps (auth, audit trail, personal data), rejected options.
- docs/adrs/001: status marks Errors and Repo layout superseded and UI / Units and BMI amended; each section links to ADR 002.
- GLOSSARY.md: adds Typical range.
- Review fixes: catalog-only messages (Nest's malformed-JSON message quoted the body), status always from the catalog, optional `details`, URL params parsed and stale offsets reset, explicit runtime checks for unreadable bodies, ranges in standard units, "one of" email/phone reported on double conflicts, keyset upgrade needs a `(createdAt, id)` index, frontmatter split into supersedes / amends.
