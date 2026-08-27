# Backend — Overview

## Purpose

REST API for the Construction CRM: authentication (with global route guards), user accounts, lead
management, customer management, project management, quotation management, and worker management —
every Phase 1 module in `.ai/PRODUCT_SPEC.md` except the standalone marketing website — plus materials &
inventory (Phase 2) and, as of 2026-08-27, real multi-tenancy: any number of independent organizations can
sign up and run fully isolated instances of all of the above, managed by a separate "platform admin"
identity. See `.ai/BE/features/multi-tenancy.md` and `.ai/BE/features/platform-admin.md`.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) | ^11.0.0 |
| Database | MongoDB via Mongoose (`@nestjs/mongoose`, `mongoose`) | mongoose ^8.9.0 |
| Auth | `@nestjs/jwt`, `bcrypt` | jwt ^11.0.0, bcrypt ^5.1.1 |
| Validation | `class-validator`, `class-transformer` | ^0.14.1 / ^0.5.1 |
| API docs | `@nestjs/swagger` | ^8.1.0 |
| Config | `@nestjs/config` | ^4.0.0 |
| Security/hardening (2026-08-24) | `helmet`, `compression`, `@nestjs/throttler` | ^8.3.0, ^1.8.1, ^6.5.0 |
| Test harness (2026-08-24) | `jest`, `ts-jest`, `@nestjs/testing`, `supertest` | ^30.4.2, ^29.4.12, ^11.2.1, ^7.2.2 |
| Language | TypeScript | ^5.7.2 |
| Runtime | Node.js | 22 (per `Dockerfile`: `node:22-alpine`) |
| Dev tooling | `@nestjs/cli`, `tsx` (for the seed script) | ^11.0.0 / ^4.19.2 |

## Directory guide

```
backend/
├── src/
│   ├── main.ts                    bootstrap: helmet/compression, global prefix `api`, CORS allow-list,
│   │                              ValidationPipe, Swagger at /docs, graceful shutdown hooks
│   ├── app.module.ts              root module: ConfigModule, MongooseModule (pool-tuned), ThrottlerModule,
│   │                              HealthModule, OrganizationsModule, PlatformModule, Auth/Users/Leads/... modules
│   ├── common/
│   │   ├── contracts/index.ts     shared enums (Role, LeadStatus, ProjectStage) and DTO interfaces
│   │   └── dto/
│   │       └── pagination-meta.dto.ts   shared Swagger response DTO, reused by every paginated list endpoint
│   ├── database/
│   │   └── seed.ts                standalone script: boots a Nest app context and triggers UsersService seeding
│   └── modules/
│       ├── README.md              module-boundary convention note
│       ├── auth/                  registration/login, JWT issuance, global auth guards
│       │   ├── dto/                     RegisterDto (+organizationSlug), LoginDto, AuthResponseDto/AuthUserDto
│       │   ├── guards/                  JwtAuthGuard, RolesGuard
│       │   └── decorators/              @Public(), @Roles(), @CurrentUser() (2026-08-27)
│       ├── organizations/         (2026-08-27) Organization schema, signup/lifecycle, GET /organizations/me
│       │   ├── guards/                  OrganizationStatusGuard
│       │   ├── decorators/              @AllowInactiveOrganization()
│       │   ├── organization.constants.ts   SLUG_PATTERN, RESERVED_SLUGS
│       │   └── dto/                     CreateOrganizationSignupDto, OrganizationResponseDto, ...
│       ├── platform/              (2026-08-27) master-admin identity — own JWT secret, org lifecycle + usage
│       │   ├── guards/                  PlatformAdminGuard
│       │   ├── decorators/              @PlatformAdminOnly(), @CurrentPlatformAdmin()
│       │   ├── organization-usage.service.ts   counts-only per-org usage aggregation
│       │   └── dto/                     PlatformLoginDto, OrganizationUsageResponseDto, ...
│       ├── users/                 user schema, lookup/create, startup seeding
│       ├── leads/                 lead schema, list/create/update-status/convert-to-customer
│       │   └── dto/                     CreateLeadDto, UpdateLeadStatusDto, LeadResponseDto, LeadListResponseDto
│       ├── customers/             customer schema, list/create/get/update
│       │   └── dto/                     CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto, CustomerListResponseDto
│       ├── projects/              project schema, list/create/get/update/update-stage
│       │   └── dto/                     CreateProjectDto, UpdateProjectDto, UpdateProjectStageDto, ProjectResponseDto, ProjectListResponseDto
│       ├── quotations/            quotation schema (embedded line items), list/create/get/update
│       │   └── dto/                     CreateQuotationDto, UpdateQuotationDto, QuotationLineItemDto, QuotationResponseDto, QuotationListResponseDto
│       ├── workers/                worker roster: schema, list/create/get/update/update-availability
│       │   ├── worker.constants.ts       WORKER_SKILL_CATEGORIES, WORKER_AVAILABILITY_STATUSES (invented, not shared contracts)
│       │   └── dto/                     CreateWorkerDto, UpdateWorkerDto, UpdateWorkerAvailabilityDto, WorkerResponseDto, WorkerListResponseDto
│       └── health/                (2026-08-24) GET /api/health — liveness/readiness probe, no Terminus
│           └── dto/                     HealthResponseDto
├── nest-cli.json                  Nest CLI config (sourceRoot: src)
├── tsconfig.json                  strict TS, CommonJS output, decorators enabled
├── tsconfig.build.json            (2026-08-24) excludes *.spec.ts from `nest build`'s output
├── jest.config.js                 (2026-08-24) ts-jest, testRegex '.*\.spec\.ts$'
├── package.json                   scripts + dependencies
├── Dockerfile                     multi-stage build → `node dist/main.js`
└── .env.example                   documented env vars (see .ai/PROJECT.md)
```

Each domain module (`auth`, `users`, `leads`, `customers`, `projects`, `quotations`, `workers`) colocates its own controller, service, Mongoose
schema, and a `dto/` subfolder — see `backend/src/modules/README.md`. This is the convention any new module
should follow. DTOs are **not** inlined in the controller file (see `.ai/BE/ARCHITECTURE.md` for why) and
every DTO/endpoint must be Swagger-documented per project convention.

## Setup / run / build / test

```bash
cd backend
cp .env.example .env
npm install

npm run start:dev     # nest start --watch — dev server on $PORT (default 4000)
npm run build          # nest build → dist/
npm run start           # node dist/main.js — run built output
npm run seed             # tsx src/database/seed.ts — run the user seeder standalone
npm test                 # jest --runInBand — 3 specs as of 2026-08-24 (quotation totals, permissions
                          # guard, health endpoint); npm run test:watch / test:cov also available
```

No CI — every check (including this test suite) is run manually; see `.ai/BE/features/production-hardening.md`
for the exact verification steps performed.
