# Participant Registry

An internal tool where staff record study participants and find them by BMI. Staff enter a participant's contact
details and body measurements, in the units they have to hand, and the system works out the BMI. They can then list
everyone and narrow the list to a BMI range.

Domain terms (participant, staff, unit, typical range) are defined in [GLOSSARY.md](GLOSSARY.md). The design
decisions are recorded in [docs/adrs](docs/adrs).

## Features

**Adding a participant**

- Name, email, phone, date of birth, weight and height. Weight can be entered in kg or lb and height in cm or in.
- The server computes BMI from the measurements after converting them to kilograms and metres. Staff never type it.
- Live validation: a field is checked when staff leave it, then on every keystroke until it is valid. Errors appear
  beside the label, and the field gets a red border.
- Required fields are marked with an asterisk. The marks come from the shared schema, so they always match what the
  server enforces.
- The phone number must be in international format (for example +14155552671). It is stored in E.164.
- The date of birth must be in the past.
- A weight or height outside the typical adult range gets a warning, not an error. Staff can check it and still
  save.
- Saving with required fields empty sends nothing and flags every missing field.
- Duplicate emails and phone numbers are rejected, and the error appears on the field concerned.

**Finding participants**

- A paginated list of participants, 20 per page, with their computed BMI.
- A BMI filter with optional minimum and maximum bounds. Max must be greater than or equal to min. Apply stays
  disabled until there is a bound to apply or an applied range to clear.
- The page and range are kept in the URL, so a refresh keeps the view, Back and Forward move through it, and a link
  can be shared. Invalid values in a URL are dropped.

**Under the hood**

- One set of Zod schemas in `shared` validates the forms in the browser and the requests on the server.
- Every endpoint uses one error contract, with a catalog of codes shared by the backend and the frontend.
- The forms are accessible: errors are announced and linked to their inputs, warnings are read out politely, and
  required fields are marked with `aria-required`.

## Stack

A pnpm monorepo with three packages:

| Package    | What it is                                                                             |
| ---------- | -------------------------------------------------------------------------------------- |
| `frontend` | React 19, Vite, React Router, TanStack Query, react-hook-form, Tailwind CSS, shadcn/ui |
| `backend`  | NestJS with Prisma on PostgreSQL                                                       |
| `shared`   | The Zod schemas, units, typical ranges and error catalog both sides use                |

## Running it locally

You need:

- Node.js 22 or newer
- pnpm
- Docker, which runs PostgreSQL

Then:

```sh
pnpm install
pnpm dev
```

`pnpm install` also creates `backend/.env` from `backend/.env.example`; the defaults match the Docker database.

`pnpm dev` starts PostgreSQL in Docker, builds `shared`, applies the migrations, seeds sample participants, and runs
the backend and frontend in watch mode. Open the URL Vite prints, normally <http://localhost:5173>. The API listens on
<http://localhost:3000>, and Vite proxies `/api` to it.

The seed can be re-run safely: participants who are already there are skipped.

### Other commands

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm test`         | Builds `shared` and runs every package's tests                      |
| `pnpm build`        | Builds every package                                                |
| `pnpm db:up`        | Starts PostgreSQL only                                              |
| `pnpm db:migrate`   | Creates and applies a migration after a change to the Prisma schema |
| `pnpm format`       | Formats the repo with Prettier                                      |
| `pnpm format:check` | Checks the formatting without changing anything                     |

The backend tests need PostgreSQL running (`pnpm db:up`). They use a separate `curebase_test` database, so they never
touch the dev data.

After you edit anything in `shared`, rebuild it (`pnpm -F @curebase/shared build`). The other packages use its built
output.

## API

| Method | Path            | What it does                                                                                     |
| ------ | --------------- | ------------------------------------------------------------------------------------------------ |
| `POST` | `/participants` | Creates a participant and returns it with its BMI                                                |
| `GET`  | `/participants` | Lists participants. Query: `limit` (1–100, default 20), `offset`, and optional `minBmi`/`maxBmi` |

Errors come back as `{ "error": { "code", "message", "details"? } }`, where `details` names the fields that failed.
