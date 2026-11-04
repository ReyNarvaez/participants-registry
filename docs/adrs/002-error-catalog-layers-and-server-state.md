---
status: accepted
supersedes: 001 (Errors, Repo layout)
amends: 001 (UI, Units and BMI)
---

# 002 — Error catalog, feature layers and server state

## Context

An architecture review of the code built under ADR 001 found four sources of friction:

- **Uniqueness is spread across four places.** "Email and phone are unique" lived in the Prisma schema, the global error filter (by Postgres index name), the shared error codes and a frontend code-to-field map. Its only test used a hand-built Prisma error, so a driver change could break every 409 while the tests stayed green.
- **The list's rules live outside the list.** App decided when the list returns to page 1 and when it re-fetches; the list only rendered what it was handed. Two of the last fix commits landed on exactly that handoff.
- **Each request repeats the wire contract.** Both `fetch` call sites built URLs, read error bodies, cast responses and handled a missing response on their own.
- **The frontend had no tests**, so none of the above could be refactored safely.

The code should also read like a production codebase someone else extends: adding a second entity should mean copying a folder, not restructuring.

ADR 001 still holds for everything this ADR does not mention: the actor, units, field rules, BMI computation and storage, API routes and the data model.

## Decisions

### Errors (supersedes ADR 001 › Errors)

- **The error code is the contract.** `shared/src/errors.ts` holds one `errorCatalog` mapping each code to its HTTP status, message and, where the code always concerns the same fields, those fields:

  | Code | Status | Fields | When |
  |---|---|---|---|
  | `VALIDATION_ERROR` | 400 | per `details`, if any | client input fails a schema, or the request is unreadable (malformed JSON, body too large) |
  | `BMI_UNUSABLE` | 400 | weight, height | weight and height give no usable BMI (below) |
  | `NOT_FOUND` | 404 | | unknown route |
  | `EMAIL_TAKEN` | 409 | email | email already registered |
  | `PHONE_TAKEN` | 409 | phone | phone already registered |
  | `INTERNAL_ERROR` | 500 | | anything unexpected |
  | `UNAVAILABLE` | none (client only) | | no response, or a response the client cannot read as the shared body (below) |

- **One error class on both sides.** `AppError { code, message, details? }` lives in `shared`. The backend throws it; the frontend rebuilds it from the response body. Errors are created through an `appError` object generated from the catalog, one method per code (`appError.emailTaken()`, `appError.validation(details)`), so adding a catalog entry adds its method and there is no second list to keep in sync.
- **Each call returns a fresh error.** A shared singleton instance would record one stale stack trace for every throw, and concurrent requests would overwrite each other's `details`.
- **Response shape:** `{ error: { code, message, details? } }`. Clients key on `code`; `message` is copied from the catalog, which costs nothing and keeps curl output and logs readable. `details` is sent only when the code alone does not say which fields failed, which today means a schema failure. An unreadable request is a `VALIDATION_ERROR` with no `details`, so clients treat `details` as optional and fall back to a form-level message. `EMAIL_TAKEN` and the other fixed-field codes carry none.
- **Duplicates are 409, not 400.** The request is well formed; it conflicts with stored state.
- **Uniqueness stays enforced by DB constraints** (no check-then-insert, which races). The participants DAL turns a violated constraint into `appError.emailTaken()` / `appError.phoneTaken()`. Postgres reports only one violated constraint per insert, so a save with both email and phone taken reports one of them (which one depends on index order, not on a rule); the next save reports the other.
- **The error filter knows no entity, and the status always matches the catalog.** It answers an `AppError` with its catalog status. Nest's own client errors become catalog codes: an unknown route is `NOT_FOUND`, and every other one (malformed JSON, body too large) is `VALIDATION_ERROR` with status 400. A client that must tell those apart gets its own code then. Anything else is a generic 500, logged on the server and never echoed.
- **Every response message comes from the catalog**, never from the exception. Nest's malformed-JSON message quotes a slice of the request body, which would echo personal data back.
- **Unusable BMI stays a hard check, with no threshold.** The BMI is rejected only when, after rounding to 2 decimals, it is not finite (height so small the division overflows; JSON cannot carry Infinity) or not above 0 (ADR 001 makes every filter bound > 0, so such a row could never be found). Both are facts about arithmetic, not judgements about bodies.

### Typical ranges for measurements

- The schema keeps ADR 001's rule: weight and height are positive with no upper limit. There is no hard plausibility range, because any such limit would be an arbitrary number that rejects real data.
- Instead, named constants in `shared` define a **typical range** in standard units: weight 30–250 kg, height 1.20–2.20 m. The entered value is converted to standard units before the comparison, so the same body gets the same answer in any unit, and there is one set of numbers. A value outside the range shows a non-blocking warning under the field ("Unusual weight: check the unit"), announced politely rather than as an error. The numbers are rough on purpose: a wrong one costs a spurious warning, never a rejected save.
- **The ranges are tuned for adults.** Nothing restricts participants to adults, so a child's correct measurements will show warnings. If the registry starts recording children, the upgrade is a range by age (from the date of birth), not wider numbers.
- **Unit conversion moves to `shared`** (amends ADR 001 › Units and BMI). The frontend now needs kg/lb and cm/in conversion for the warning, so the conversion constants and a standard-units helper live in `shared`. The BMI formula, rounding and the usable-BMI check stay in `backend/src/participants/bmi.ts`, because only the backend computes BMI.

### Shared layout

- `shared/src/schemas/<entity>.ts`: one file per entity holding its create schema, list query schema, response types and typical ranges. `shared/src/errors.ts` (the catalog) and `shared/src/units.ts` (unit conversion) sit beside `schemas/`; `index.ts` re-exports them.

### Backend layout (supersedes ADR 001 › Repo layout, backend part)

Each feature is a standard Nest module:

```
backend/src/
  common/
    error.filter.ts          AppError → catalog status; anything else → 500
    zod-validation.pipe.ts   failed parse → appError.validation(details)
    prisma/prisma.service.ts
    dal/base.dal.ts          abstract BaseDal
  participants/
    participants.controller.ts   HTTP only
    participants.service.ts      rules: calls bmi() and the DAL, never Prisma
    participants.dal.ts          the only file that touches Prisma
    participants.module.ts
    bmi.ts                       plain helper function
```

- **Only a DAL touches Prisma.** `BaseDal` offers protected helpers only: `paginate()` (the page and its total read in one RepeatableRead transaction, returned as `{ items, total, limit, offset }`) and `uniqueFields()` (a violated unique index → its `appError`). Subclasses expose methods named after what they do (`create`, `list`).
- **No generic CRUD in the base.** Prisma's per-model delegates share no TypeScript type, so generic `findAll` / `create` methods would end up typed `any` and lose Prisma's typed queries, while every caller still needs its own `where` and `orderBy`.
- DALs are plain injected classes. There are no `interface`s or abstract repositories for single implementations.
- **No DTO files.** Request types are the ones inferred from the shared schemas, imported directly; re-exporting them under DTO names would add a second name with nothing behind it. A shared `PrismaModule` (global) gives every DAL the one Prisma client.

### Frontend layout (supersedes ADR 001 › Repo layout, frontend part)

```
frontend/src/
  app/          App (providers), routes.tsx                → wrappers
  pages/        ParticipantsPage, NotFoundPage             → views: composition only, no data logic
  features/
    participants/
      components/   ParticipantForm, ParticipantList, BmiFilter
      api.ts        request functions for /participants
      queries.ts    TanStack Query hooks              → feature modules
  components/   ui/ (shadcn/ui), Field, Busy: generic UI, knows no feature
  lib/          api-client, query-client, form-errors: non-UI building blocks
```

- **Imports point downward only:** `app` → `pages` → `features` → `components` / `lib`. Features never import each other; `components` and `lib` never import a feature.
- **Routing:** React Router v7. `/` redirects to `/participants`; any other path shows NotFoundPage.
- **Request functions live in the frontend, not `shared`.** Only the frontend calls the API (the same reasoning ADR 001 uses to keep `bmi.ts` in the backend). `lib/api-client.ts` owns `fetch`, JSON, rebuilding `AppError` and `UNAVAILABLE`; feature `api.ts` files build on it.
- **Successful responses are cast, not parsed.** The backend is ours, and parsing would need response schemas nothing else uses. The client does check two things at runtime: a failed response counts as the shared body only if it is JSON with an `error.code` the catalog knows, and a response of either kind that is not JSON at all (a proxy's HTML error page, or the app's own `index.html` from a misrouted request) becomes `UNAVAILABLE` instead of an unhandled parse error.
- Which error fields belong on which input is form knowledge, so `lib/form-errors.ts` maps catalog fields and `details` onto react-hook-form fields for whichever form calls it.

### Styling and UI components

- **Tailwind CSS v4 with shadcn/ui.** shadcn/ui's CLI copies Radix-based components (Button, Input, Select, Label, Table, Alert and others) into `components/ui/`. They get accessible keyboard and focus behaviour from Radix, and they live in the generic `components` layer.
- **One theme.** Colours, radius and typography are CSS variables in a single stylesheet, mapped into Tailwind with `@theme`. Components use those tokens, never raw colours, so a theme change is one file.
- The generated code is ours: shadcn/ui updates are applied by re-running its CLI and reviewing the diff, not by bumping a package.

### Server state and the list (amends ADR 001 › UI)

- **TanStack Query** holds server state: `useQuery` for the list, keeping the previous page on screen while the next one loads; `useMutation` for create, invalidating the list on success. Retries are off: repeating a 4xx is wrong and slows tests. It replaces hand-written loading and error state, the guard that ignores late responses, and the re-fetch signal between form and list. No Curebase-specific alternative turned up, and it is the mainstream React choice.
- **The list's offset and BMI range live in the URL** (`/participants?offset=20&minBmi=18.5`), owned by the participants feature. Refresh keeps the filter, Back and Forward move between pages, and a view can be shared as a link.
- **The URL is untrusted input.** The feature parses its params with `listParticipantsQuerySchema` before they drive a request. Invalid params are dropped from the URL and the list loads without them, rather than failing the page with a 400. An offset at or past `total` (a stale link after the filtered list shrank) moves the list back to page 1.
- **After a save** the form shows the computed BMI and clears (as in ADR 001), and the list returns to page 1, keeping the BMI range.
- **While the list loads**, a spinner covers the current rows, the list is marked `aria-busy`, and Apply, Clear, Previous and Next are disabled. Save stays disabled while saving.
- **BMI bounds are sent as typed.** The filter passes min/max as the raw strings staff entered, because a number round-trip turns `0.0000001` into `1e-7`, which the server rejects.

### Pagination

- Offset pagination stays, deliberately. It is simple, supports "page N of M" with a `total`, and is fast at this size. The upgrade path is keyset pagination on `(createdAt, id)` when deep pages on a large table get slow. The existing order and tie-breaker already define a stable key, but the upgrade must also add an `@@index([createdAt, id])` (none exists today), or keyset queries still sort the whole table.

### Testing

- **Frontend:** vitest, jsdom, Testing Library and user-event. Tests render the real `App` (memory router, query client) with a stubbed `fetch` as the only adapter, and act like staff. There are no component- or hook-level tests, so the tests survive the restructuring above unchanged.
- **Backend:** database tests run through the service against `curebase_test` with the real DAL underneath. Duplicate email and phone are tested by real inserts, replacing the hand-built Prisma error.

### Known gaps

- **No authentication** (carried over from ADR 001). It must land before any non-local deployment.
- **No audit trail** of which staff member created or changed a participant. It needs authentication first.
- **Personal and health data:** error responses never echo input values, and unexpected errors are logged on the server only. Log contents are not otherwise filtered.

## Considered options

- **Static `AppError.emailTaken()` methods on the class:** every new code would mean editing both the class and the catalog. Rejected in favour of the `appError` object generated from the catalog.
- **Error responses with the code only:** rejected because sending the message costs nothing and keeps curl output and logs readable.
- **`details` on every 409:** rejected because the catalog already names the field.
- **Hard plausibility bounds on weight and height:** rejected because they would be arbitrary numbers that reject real data. Typical ranges warn instead.
- **Generic CRUD base DAL, or a Prisma `$extends` extension on all models:** the first loses typing; the second fights Nest's dependency injection.
- **Re-fetching the list via a `reloadKey` prop, an imperative handle, or remounting with `key`:** a prop and a handle are interface with no behaviour behind it; remounting wipes the BMI filter. Replaced by query invalidation plus URL state.
- **Request functions in `shared`:** rejected because only the frontend calls the API.
- **daisyUI, or Mantine / MUI / Chakra, for the UI:** daisyUI is styling only, so Select and focus behaviour would be hand-built; the full libraries bring their own styling systems instead of Tailwind. TanStack Table is unnecessary: the table is server-paged with no sorting.
- **Rewriting ADR 001 in place:** rejected because it would lose why decisions changed. ADR 001 is marked as partly superseded instead.

## Consequences

- New frontend dependencies: `react-router`, `@tanstack/react-query`, Tailwind CSS and the shadcn/ui runtime (Radix packages, `class-variance-authority`, `clsx`, `tailwind-merge`, an icon set), and for tests `vitest`, `jsdom`, `@testing-library/react` and `@testing-library/user-event`.
- A second entity is added by copying `shared/src/schemas/participant.ts`, `backend/src/participants/` (with a DAL extending `BaseDal`) and `frontend/src/features/participants/`, plus one route and one page.
