---
# curebase-z9be
title: Monorepo boots end to end
status: completed
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:02:55Z
updated_at: 2026-11-04T00:37:10Z
---

## What to build

The monorepo from ADR 001 boots end to end: one command brings up Postgres, the NestJS backend and the React frontend, and the page shows a value fetched from the backend, which both apps type against the `shared` package.

## Acceptance criteria

- [x] pnpm workspaces: frontend (React), backend (NestJS), shared
- [x] Postgres runs via docker-compose; Prisma is connected to it
- [x] frontend and backend both import from `shared`
- [x] The page renders a response from one backend endpoint
- [x] A test runner works in backend and frontend (one passing test each)

## Blocked by

None (can start immediately)

## Summary of Changes

- pnpm workspace (`pnpm-workspace.yaml`) with `frontend` (Vite 8 + React 19, TS 7), `backend` (NestJS 12, ESM, TS 6) and `shared` (`@curebase/shared`). `allowBuilds` approves the `prisma` and `@prisma/engines` install scripts.
- `shared` is a compiled ESM package: `tsc` emits `dist/` and `exports` points to `./dist/index.js`. Both apps depend on it with `workspace:*`. Its `prepare` script builds it on `pnpm install`, root `test` rebuilds it so tests never see a stale `dist`, `build` builds it in topological order, and `dev` runs `tsc --watch` so edits reach both running apps. `pnpm dev` also starts Postgres, so one command boots everything.
- `docker-compose.yml`: `postgres:18`, compose project `curebase` (container `curebase-db-1`), published on `127.0.0.1:5432` only, named volume, TCP healthcheck so `docker compose up --wait` returns only when Prisma can connect.
- Prisma 7.10.1 (stable, pinned; npm `latest` points at an 8.0 RC): `backend/prisma.config.ts`, `backend/prisma/schema.prisma` (no models yet), `prisma-client` generator into `backend/src/generated/prisma` (backend `postinstall`). `@prisma/adapter-pg` in `PrismaService`, which disconnects on shutdown (`enableShutdownHooks`). `DATABASE_URL` is in `backend/.env` (gitignored; copy from `backend/.env.example`). `prisma.config.ts` and `main.ts` load it only if the file exists, and the config reads `process.env.DATABASE_URL` directly, so install and `prisma generate` work without it.
- `GET /health` (route name `HEALTH_PATH` and type `Health` from `shared`) runs `SELECT 1` through Prisma and returns `{"db":"up"}`. The page fetches it through the Vite dev proxy (`/api/` goes to `localhost:3000`, prefix stripped) and renders "Database: up".
- Tests: Vitest in both apps (the Nest 12 template default). Backend `app.controller.spec.ts` and frontend `api.test.ts`.
- Template extras removed (oxlint, prettier, e2e harness, README/AGENTS.md, demo assets).
