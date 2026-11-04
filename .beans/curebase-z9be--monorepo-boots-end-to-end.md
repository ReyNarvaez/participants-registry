---
# curebase-z9be
title: Monorepo boots end to end
status: todo
type: task
tags:
    - ready-for-agent
created_at: 2026-11-04T00:02:55Z
updated_at: 2026-11-04T00:02:55Z
---

## What to build

The monorepo from ADR 001 boots end to end: one command brings up Postgres, the NestJS backend and the React frontend, and the page shows a value fetched from the backend, which both apps type against the `shared` package.

## Acceptance criteria

- [ ] pnpm workspaces: frontend (React), backend (NestJS), shared
- [ ] Postgres runs via docker-compose; Prisma is connected to it
- [ ] frontend and backend both import from `shared`
- [ ] The page renders a response from one backend endpoint
- [ ] A test runner works in backend and frontend (one passing test each)

## Blocked by

None (can start immediately)
