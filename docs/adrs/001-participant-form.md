---
status: accepted
---

# 001 — Participant form with server-computed BMI

## Context

Staff enter participants (name, email, phone, date of birth, weight, height) through an internal form. Each participant's BMI is computed from weight and height, and staff filter the participant list by a min/max BMI range. Staff may enter weight and height in different units, so BMI can't be computed from the raw values directly.

## Decisions

### Actor
- The form is filled in by **staff**, never by the participant. It is an internal tool.
- **No authentication** in this scope. Known gap: the table holds personal and health data, so auth must land before any non-local deployment.

### Units and BMI
- Each measurement has its own unit, chosen independently:
  - weight: `kg | lb`
  - height: `cm | in`
- The API contract carries the selected unit alongside each value (`weight`, `weightUnit`, `height`, `heightUnit`).
- A backend function (`backend/src/participants/bmi.ts`) normalizes to standard units (kg, m), computes `BMI = kg / m²`, rounds to 2 decimals and persists it on POST. The client never sends BMI. Only the backend calls this function, so it doesn't live in `shared/`.
- Only the as-entered value + unit and the BMI are stored. Normalized kg/m values are not stored. BMI is a stored, indexed column so the range filter, `total` and pagination all run in the database.
- The computed BMI is returned in the POST response and in every list item. There is no live preview.

### Validation (Zod only)
- **Zod is the single validation library.** No Joi, no class-validator. Schemas live in `shared/` and provide both TS types (`z.infer`) and runtime validation:
  - frontend: react-hook-form + `zodResolver`
  - backend: a Nest `ZodValidationPipe`; DTOs are types inferred from the shared schemas
- Field rules:
  - `name`: non-empty string
  - `email`: valid email, **unique**
  - `phone`: valid per `libphonenumber-js`, stored normalized as E.164 (`+15551234567`), **unique**
  - `dateOfBirth`: valid date in the past. Age is derived, never stored.
  - `weight`, `height`: positive numbers (doubles), no upper limit
  - `weightUnit`, `heightUnit`: enum values above
- List filter rules: `minBmi` and `maxBmi` are each optional and inclusive, must be > 0, and `minBmi ≤ maxBmi` when both are given.

### Errors (shared error library)
- `shared/` exports the error codes and one response shape used by every endpoint:
  ```ts
  { error: { code: ErrorCode; message: string; details?: { field: string; message: string }[] } }
  ```
- Initial codes and HTTP status:
  - `VALIDATION_ERROR` → 400 (Zod issues mapped to `details`)
  - `EMAIL_TAKEN` → 409
  - `PHONE_TAKEN` → 409
  - `INTERNAL_ERROR` → 500
- A global Nest exception filter maps `ZodError` and Prisma unique violations (`P2002`) to this shape. The frontend maps `details[].field` onto form fields.
- Uniqueness is enforced by DB unique constraints, not by a check-then-insert in app code (that would race).

### UI
- One page: the participant form on top, the BMI-filterable list below.
- After a successful POST the form shows the computed BMI from the response and clears its inputs, and the list reloads.

### API
- `POST /participants`: create. Returns 201 with the participant, BMI included.
- `GET /participants?minBmi=&maxBmi=&limit=&offset=`: list.
  - Offset pagination: `limit` defaults to 20 (max 100), `offset` defaults to 0.
  - Order: `createdAt desc, id desc` (the `id` tie-breaker keeps pages stable when timestamps collide).
  - Response: `{ items: Participant[], total, limit, offset }`.
- Out of scope: update, delete, get-by-id, auth.

### Repo layout
pnpm workspaces monorepo:
```
repo/
  frontend/          React app
  backend/           NestJS (standard module structure)
    prisma/          schema + migrations
    src/participants/
      participants.controller.ts
      participants.service.ts
      participants.module.ts
  shared/            Zod schemas, inferred types, unit enums, error codes
  docker-compose.yml Postgres
```

### Data model (Prisma / PostgreSQL)
```
Participant
  id           String @id @default(cuid())
  name         String
  email        String  @unique
  phone        String  @unique   // E.164
  dateOfBirth  DateTime
  weight       Float             // as entered
  weightUnit   WeightUnit        // kg | lb
  height       Float             // as entered
  heightUnit   HeightUnit        // cm | in
  bmi          Float             // computed on create, 2 decimals; indexed for range filter
  createdAt    DateTime @default(now())
```
