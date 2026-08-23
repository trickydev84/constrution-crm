# Backend — Overview

## Purpose

REST API for the Construction CRM: authentication (with global route guards), user accounts, lead
management, customer management, project management, quotation management, and worker management today —
every Phase 1 module in `.ai/PRODUCT_SPEC.md` except the standalone marketing website. The shared contracts
layer anticipates a broader Phase 2+ domain (materials, suppliers, billing, etc.) not yet implemented.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) | ^11.0.0 |
| Database | MongoDB via Mongoose (`@nestjs/mongoose`, `mongoose`) | mongoose ^8.9.0 |
| Auth | `@nestjs/jwt`, `bcrypt` | jwt ^11.0.0, bcrypt ^5.1.1 |
| Validation | `class-validator`, `class-transformer` | ^0.14.1 / ^0.5.1 |
| API docs | `@nestjs/swagger` | ^8.1.0 |
| Config | `@nestjs/config` | ^4.0.0 |
| Language | TypeScript | ^5.7.2 |
| Runtime | Node.js | 22 (per `Dockerfile`: `node:22-alpine`) |
| Dev tooling | `@nestjs/cli`, `tsx` (for the seed script) | ^11.0.0 / ^4.19.2 |

## Directory guide

```
backend/
├── src/
│   ├── main.ts                    bootstrap: global prefix `api`, CORS, ValidationPipe, Swagger at /docs
│   ├── app.module.ts              root module: ConfigModule, MongooseModule, Auth/Users/Leads/Customers modules
│   ├── common/
│   │   ├── contracts/index.ts     shared enums (Role, LeadStatus, ProjectStage) and DTO interfaces
│   │   └── dto/
│   │       └── pagination-meta.dto.ts   shared Swagger response DTO, reused by every paginated list endpoint
│   ├── database/
│   │   └── seed.ts                standalone script: boots a Nest app context and triggers UsersService seeding
│   └── modules/
│       ├── README.md              module-boundary convention note
│       ├── auth/                  registration/login, JWT issuance, global auth guards
│       │   ├── dto/                     RegisterDto, LoginDto, AuthResponseDto/AuthUserDto
│       │   ├── guards/                  JwtAuthGuard, RolesGuard
│       │   └── decorators/              @Public(), @Roles()
│       ├── users/                 user schema, lookup/create, startup seeding
│       ├── leads/                 lead schema, list/create/update-status/convert-to-customer
│       │   └── dto/                     CreateLeadDto, UpdateLeadStatusDto, LeadResponseDto, LeadListResponseDto
│       ├── customers/             customer schema, list/create/get/update
│       │   └── dto/                     CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto, CustomerListResponseDto
│       ├── projects/              project schema, list/create/get/update/update-stage
│       │   └── dto/                     CreateProjectDto, UpdateProjectDto, UpdateProjectStageDto, ProjectResponseDto, ProjectListResponseDto
│       ├── quotations/            quotation schema (embedded line items), list/create/get/update
│       │   └── dto/                     CreateQuotationDto, UpdateQuotationDto, QuotationLineItemDto, QuotationResponseDto, QuotationListResponseDto
│       └── workers/                worker roster: schema, list/create/get/update/update-availability
│           ├── worker.constants.ts       WORKER_SKILL_CATEGORIES, WORKER_AVAILABILITY_STATUSES (invented, not shared contracts)
│           └── dto/                     CreateWorkerDto, UpdateWorkerDto, UpdateWorkerAvailabilityDto, WorkerResponseDto, WorkerListResponseDto
├── nest-cli.json                  Nest CLI config (sourceRoot: src)
├── tsconfig.json                  strict TS, CommonJS output, decorators enabled
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
npm test                 # jest --runInBand
```

**Note:** `npm test` is defined in `package.json`, but no `*.spec.ts` / `*.test.ts` files exist anywhere in
`backend/src` at present — there is currently nothing for Jest to run.
