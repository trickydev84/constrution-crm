# Construction CRM

## One-liner

A CRM for a construction business to track leads, projects, and (eventually) customers, quotations, workers,
materials, and finance — currently a NestJS + MongoDB API with a mostly-static Next.js dashboard on top.

## Repo layout

```
.
├── backend/            NestJS REST API (MongoDB via Mongoose)
│   └── src/
│       ├── main.ts               bootstrap, global prefix, CORS, validation, Swagger
│       ├── app.module.ts         root module wiring
│       ├── common/contracts/     shared enums & DTOs (source of truth for domain vocabulary)
│       ├── database/seed.ts      standalone seed script entry point
│       └── modules/              one folder per domain module (auth, users, leads)
├── frontend/            Next.js 15 App Router dashboard
│   └── src/app/         layout.tsx, page.tsx, styles.css
├── docker-compose.yml    mongodb + api + web, for local multi-container runs
└── .env.example          shared env var reference (root-level; each project also has its own)
```

## Frontend ↔ backend contract

- **Backend base URL:** `http://localhost:4000/api` (global prefix `api` set in `backend/src/main.ts`)
- **Swagger / OpenAPI docs:** `http://localhost:4000/docs`
- **Frontend → backend:** the frontend reads the API base URL from `NEXT_PUBLIC_API_URL`, but **no frontend
  code currently calls the backend** — see `.ai/FE/ARCHITECTURE.md`. `frontend/src/app/page.tsx` renders
  entirely hardcoded mock data.
- **Auth mechanism:** `POST /api/auth/register` and `POST /api/auth/login` return a signed JWT
  (`accessToken`) via `@nestjs/jwt`. A global `JwtAuthGuard` (`backend/src/modules/auth/`) now requires this
  token as `Authorization: Bearer <token>` on every route except those marked `@Public()` (currently only
  `register`/`login`). Role-based restriction (`RolesGuard` + `@Roles()`) is implemented but not yet applied
  to any specific route. See `.ai/BE/features/auth.md`.
- **Organization model:** this is a **single-organization** system, not multi-tenant. Every record
  (`User.organizationId`, `Lead.organizationId`) is stamped with the same constant organization id
  (env var `DEFAULT_ORGANIZATION_ID`, default `'default'`). There is no per-tenant isolation logic and none
  is intended.

## Running both projects locally

### Option A — Docker Compose (from repo root)

```bash
cp .env.example .env
docker compose up
```

Starts `mongodb` (port 27017), `api` (port 4000, backend), `web` (port 3000, frontend).

### Option B — manual, two terminals

```bash
# backend
cd backend
cp .env.example .env
npm install
npm run start:dev      # http://localhost:4000/api, docs at /docs

# frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev             # http://localhost:3000
```

MongoDB must be reachable at `MONGODB_URI` (e.g. run it separately via
`docker run -p 27017:27017 mongo:8`, or point at an existing instance).

## Environment variables

### Backend (`backend/.env.example`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongoose connection string |
| `JWT_SECRET` | Secret used to sign/verify auth JWTs |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `15m`) |
| `PORT` | HTTP port the Nest app listens on (default 4000) |
| `DEFAULT_ORGANIZATION_ID` | Constant organization id stamped on seeded users (default `'default'`) |
| `SEED_USERS` | If not `'false'`, seeds the 7 default role accounts on every boot |
| `SEED_DEFAULT_PASSWORD` | Password used for all seeded accounts except superadmin (if not overridden) |
| `SEED_SUPERADMIN_EMAIL` | Email for the seeded superadmin account |
| `SEED_SUPERADMIN_PASSWORD` | Password for the seeded superadmin account |

### Frontend (`frontend/.env.example`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the frontend should use to call the backend API (currently unused in code) |

## Glossary

| Term | Meaning |
|---|---|
| **Lead** | A prospective customer inquiry, tracked through a sales pipeline (`LeadStatus`). |
| **Lead status** | One of `NEW`, `CONTACTED`, `SITE_VISIT`, `QUOTATION_SENT`, `NEGOTIATION`, `WON`, `LOST` (`backend/src/common/contracts/index.ts`). |
| **Project stage** | One of `PLANNING`, `FOUNDATION`, `STRUCTURE`, `BRICKWORK`, `PLUMBING`, `ELECTRICAL`, `FLOORING`, `PAINTING`, `INTERIOR`, `INSPECTION`, `HANDOVER` — defined in shared contracts but **no Projects module exists yet** to use it. |
| **Role** | One of `SUPERADMIN`, `ADMIN`, `SALES`, `PROJECT_MANAGER`, `SUPERVISOR`, `ACCOUNTANT`, `CUSTOMER`. Stored on `User.role`; not currently enforced by any guard. |
| **Organization** | A single fixed tenant id stamped on all records; this system is single-org, not multi-tenant. |

## Roadmap decisions (confirmed 2026-08-08, updated 2026-08-08)

- **Auth guards / route protection: shipped.** A global `JwtAuthGuard` + `RolesGuard` now enforce
  authentication on every backend route by default (opt-out via `@Public()`), applied ahead of new features
  as planned. See `.ai/BE/features/auth.md` for what's still open (role-restricted routes, `register`'s
  unconditional `ADMIN` grant).
- **`register`'s privilege-escalation gap: resolved 2026-08-08.** Confirmed decision: keep registration
  public (unauthenticated) but default the created role to `CUSTOMER` instead of `ADMIN` — anticipating
  customer self-signup for the future customer portal. Staff accounts remain seeder-only; there is still no
  way to create a `SALES`/`PROJECT_MANAGER`/etc. account via any API.
- The frontend dashboard's hardcoded data (`frontend/src/app/page.tsx`) is a placeholder awaiting real API
  wiring (starting with `GET /api/leads`), not a permanent mockup — see `.ai/FE/features/dashboard-shell.md`.
  Unstarted; now unblocked since `GET /api/leads` requires auth the frontend doesn't yet send.

## Product roadmap

The founder's BRD/PRD (shared 2026-08-08) answers what was previously an open question about the roadmap for
Projects/Customers/Quotations/Workers/Materials/Finance: they are all planned modules with a defined phase
order. See `.ai/PRODUCT_SPEC.md` for the full module table, phase breakdown, and role definitions. Every
planned module now has a status row in `.ai/BE/FEATURES.md` and a stub file under `.ai/BE/features/`.

## Open questions

- Is the public marketing website (Home/Services/Projects/About/Gallery/etc., per the Master Plan) part of
  this `frontend/` app, a separate site, or a separate repo? See `.ai/PRODUCT_SPEC.md` Open questions.
- Should the frontend migrate to Tailwind CSS (PRD's suggested stack) or continue with plain CSS?
- What file storage solution (PRD suggests AWS S3) should back document/photo uploads needed by Project,
  Quotation, Daily Site Report, and Expense modules?
- Does `SUPERADMIN` (in code, `Role` enum) map onto the PRD's `Administrator` role, or is it a distinct tier
  the PRD hasn't caught up to?
