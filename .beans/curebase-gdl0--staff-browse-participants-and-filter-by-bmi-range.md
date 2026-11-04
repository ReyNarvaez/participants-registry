---
# curebase-gdl0
title: Staff browse participants, newest first, with pagination
status: todo
type: feature
priority: normal
tags:
    - ready-for-agent
created_at: 2026-11-04T00:01:23Z
updated_at: 2026-11-04T00:02:55Z
blocked_by:
    - curebase-916d
---

## What to build

Below the form, staff see participants newest first and page through them. The list reloads after a successful create.

## Acceptance criteria

- [ ] `GET /participants?limit=&offset=` returns `{ items, total, limit, offset }`, every item including BMI
- [ ] `limit` defaults to 20 (max 100) and `offset` to 0; order is `createdAt desc, id desc`
- [ ] Invalid params return the shared 400 shape
- [ ] UI renders the list with paging and reloads after a create
- [ ] Test covers stable pagination when timestamps collide
