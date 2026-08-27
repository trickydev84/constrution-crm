# Backend — Data model

Eleven Mongoose collections exist today: `User`, `Lead`, `Customer`, `Project`, `Quotation`, `Worker`,
`Material`, `MaterialRequest`, `Permission`, `Organization`, and `PlatformAdmin`. **2026-08-27:** the
first nine are now genuinely tenant-scoped — `organizationId` on each is a real `Organization.slug`,
enforced (`required: true`, no default) and filtered on every query, not the hardcoded `'default'`
constant this file described until this pass (see `.ai/BE/features/multi-tenancy.md`).
`PlatformAdmin` is deliberately **not** tenant-scoped — it's a separate, org-independent identity
(see `.ai/BE/features/platform-admin.md`).

## Entities

### User (`backend/src/modules/users/user.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `email` | string | required, unique, stored lowercase |
| `password` | string | required, bcrypt hash (cost 12). Excluded via `.select('-password')` from both `GET /api/users` and `GET /api/users/:id` (added 2026-08-10, `.ai/BE/features/user-accounts.md`) — never leaves the service layer over HTTP |
| `role` | string | required, default `'CUSTOMER'`; expected values are the `Role` enum in `common/contracts/index.ts`, but the schema field is a plain `String`, not enum-constrained |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `active` | boolean | default `true`; not currently read or updated anywhere after creation |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### Lead (`backend/src/modules/leads/lead.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `phone` | string | required |
| `email` | string | optional |
| `source` | string | optional |
| `status` | string | default `'NEW'`; expected values are the `LeadStatus` enum in `common/contracts/index.ts`, but not enum-constrained at the schema or DTO layer |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `notes` | string | optional |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### Customer (`backend/src/modules/customers/customer.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `phone` | string | required |
| `email` | string | optional |
| `address` | string | optional, free text (not a structured object) |
| `leadId` | string | optional; `Lead._id` this customer was converted from, if any. Plain string field, not a Mongoose `ref` — no `.populate()` support |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `notes` | string | optional |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### Project (`backend/src/modules/projects/project.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `customerId` | string | required; `Customer._id` this project belongs to. Validated to exist at create time by `ProjectsService` (via `CustomersService.findById`), but stored as a plain string, not a Mongoose `ref` |
| `stage` | string | default `'PLANNING'`; expected values are the `ProjectStage` enum in `common/contracts/index.ts`, not enum-constrained at the schema or DTO layer (same gap as `Lead.status`) |
| `projectManagerId` | string | optional; intended `User._id` of the assigned Project Manager. **Not validated** to exist or to have the `PROJECT_MANAGER` role |
| `supervisorId` | string | optional; intended `User._id` of the assigned Site Supervisor. **Not validated** to exist or to have the `SUPERVISOR` role |
| `budget` | number | optional; bare amount, no currency field |
| `startDate` | Date | optional |
| `endDate` | Date | optional |
| `progressPercent` | number | optional; bounded 0–100 at both the Mongoose (`min`/`max`) and DTO (`@Min`/`@Max`) layers |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `notes` | string | optional |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### Quotation (`backend/src/modules/quotations/quotation.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `leadId` | string | required; `Lead._id` this quotation is issued for. Validated to exist at create time by `QuotationsService` (via `LeadsService.findById`), stored as a plain string, not a Mongoose `ref` |
| `lineItems` | `QuotationLineItem[]` | embedded subdocuments (`{ _id: false }` — no independent line-item ids); each has `description` (string), `category` (`'MATERIAL'\|'LABOR'`), `quantity` (number), `unitPrice` (number), `amount` (number, = `quantity × unitPrice`, computed server-side) |
| `taxPercent` | number | default `0` |
| `discountPercent` | number | default `0` |
| `subtotal` | number | default `0`; computed server-side, sum of `lineItems[].amount` |
| `discountAmount` | number | default `0`; computed server-side, `subtotal × discountPercent / 100` |
| `taxAmount` | number | default `0`; computed server-side, `(subtotal − discountAmount) × taxPercent / 100` — tax is applied **after** discount |
| `total` | number | default `0`; computed server-side, `subtotal − discountAmount + taxAmount` |
| `notes` | string | optional |
| `terms` | string | optional |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### Worker (`backend/src/modules/workers/worker.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `phone` | string | required |
| `skillCategory` | string | required; validated at the DTO layer against `WORKER_SKILL_CATEGORIES` (`MASON`, `ELECTRICIAN`, `PLUMBER`, `CARPENTER`, `PAINTER`, `MARBLE_WORKER`, `WELDER`) — **strictly** enforced (unlike `Lead.status`/`Project.stage`), but not enum-constrained at the Mongoose schema level either |
| `dailyWage` | number | optional; bare amount, no currency field |
| `availabilityStatus` | string | default `'AVAILABLE'`; validated at the DTO layer against `WORKER_AVAILABILITY_STATUSES` (`AVAILABLE`, `ASSIGNED`, `ON_LEAVE`, `INACTIVE`) — invented for this module, not PRD-specified |
| `assignedProjectId` | string | optional; intended `Project._id` currently assigned to. **Not validated** to exist |
| `rating` | number | optional; bounded 1–5 at both the Mongoose (`min`/`max`) and DTO (`@Min`/`@Max`) layers |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `notes` | string | optional |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### Material (`backend/src/modules/materials/material.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `category` | string | required; validated at the DTO layer against `MATERIAL_CATEGORIES` (`CEMENT`, `SAND`, `STEEL`, `BRICKS`, `MARBLE`, `TILES`, `PAINT`, `OTHER`) — invented for this module, not PRD-specified. Not enum-constrained at the Mongoose schema level (same gap as `Worker.skillCategory`) |
| `unit` | string | required, free text (`"bag"`, `"kg"`, `"ton"`, `"sq ft"`) — not constrained, units vary too widely by category |
| `unitPrice` | number | default `0`; bare amount, no currency field |
| `stockQuantity` | number | default `0`; current stock on hand, company-wide (not per-project — a user-directed design decision, see `.ai/BE/features/material-inventory-management.md`) |
| `reorderLevel` | number | default `0`; stock at or below this level surfaces via `GET /materials/low-stock` |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `notes` | string | optional |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### MaterialRequest (`backend/src/modules/materials/material-request.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `projectId` | string | required; intended `Project._id` this material is requested for. **Not validated** to exist — matches `Worker.assignedProjectId`'s gap |
| `materialId` | string | required; `Material._id` requested. Validated to exist at create time by `MaterialRequestsService` (`404` if not), stored as a plain string, not a Mongoose `ref` |
| `quantity` | number | required, `min: 0` |
| `status` | string | default `'REQUESTED'`; validated at the DTO/service layer against `MATERIAL_REQUEST_STATUSES` (`REQUESTED`, `APPROVED`, `FULFILLED`, `REJECTED`) via named service methods (`approve()`/`reject()`/`fulfill()`), each with its own transition guard — not enum-constrained at the Mongoose schema level (same gap as `Lead.status`) |
| `requestedBy` | string | optional; intended `User._id` of the requester. **Not validated** — no `GET /users` endpoint exists yet |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `notes` | string | optional |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

Fulfilling a request (`PATCH /material-requests/:id/fulfill`) atomically decrements the referenced
`Material.stockQuantity` via a single conditional `findOneAndUpdate` — see
`.ai/BE/features/material-inventory-management.md` for why that matters under concurrent fulfillments.

### Permission (`backend/src/modules/permissions/permission.schema.ts`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `role` | string | required, **Mongoose-`enum`-constrained** to `Role` — unlike every other schema's `role`/status-like field in this app (`User.role`, `Lead.status`, `Project.stage`, `Worker.skillCategory`/`availabilityStatus`, `Material.category`, `MaterialRequest.status`), which are intentionally open strings. A typo'd role here would silently create a dead, unreachable row, so this one schema was given the stricter treatment — see the Open questions note below. |
| `resource` | string | required, **Mongoose-`enum`-constrained** to `Resource` (`common/contracts/index.ts`: `LEADS, CUSTOMERS, PROJECTS, QUOTATIONS, WORKERS, MATERIALS, PERMISSIONS`) |
| `organizationId` | string | required, `Organization.slug` — no default, no schema-level FK enforcement |
| `canView` | boolean | default `false` |
| `canWrite` | boolean | default `false` |
| `canDelete` | boolean | default `false` — no route in the app currently exercises this (no delete endpoints exist anywhere yet) |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

Unique compound index on `{ role, resource, organizationId }` — prevents duplicate rows and doubles as the
lookup index `PermissionsService.check()` hits on every protected request. See
`.ai/BE/features/permissions.md`.

### Organization (`backend/src/modules/organizations/organization.schema.ts`) — added 2026-08-27

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `slug` | string | required, **unique**, lowercase, `^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$`, **immutable** (no rename endpoint). This value is stored verbatim as `organizationId` on every business document above |
| `status` | string | required, Mongoose-`enum`-constrained to `OrganizationStatus` (`PENDING\|ACTIVE\|SUSPENDED\|REJECTED`), default `PENDING` |
| `contactEmail` | string | required, lowercase — the signup email |
| `contactPhone` | string | optional |
| `ownerUserId` | string | optional; `User._id` of the org's first `SUPERADMIN`, set right after signup creates that user. Plain string, not a Mongoose `ref` |
| `trialStartsAt` | Date | optional; set at signup |
| `trialEndsAt` | Date | optional/`null`; `null` means no trial limit (used by the legacy `default` org). Not yet enforced anywhere (Stage 2) |
| `approvedAt` / `approvedBy` | Date / string | set by `approve()`; `approvedBy` is a `PlatformAdmin._id` |
| `rejectedAt` / `rejectionReason` | Date / string | set by `reject()` |
| `suspendedAt` / `suspensionReason` | Date / string | set by `suspend()` |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

### PlatformAdmin (`backend/src/modules/platform/platform-admin.schema.ts`) — added 2026-08-27

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongoose default |
| `name` | string | required |
| `email` | string | required, unique, stored lowercase — its own uniqueness domain, independent of `User.email` |
| `password` | string | required, bcrypt hash (cost 12) |
| `active` | boolean | default `true` |
| `createdAt` / `updatedAt` | Date | from `{ timestamps: true }` |

Deliberately its own collection, not a `User` with `organizationId: null` — see
`.ai/BE/features/platform-admin.md` for the rejected alternative and why. No relationship to any
other entity in this file; it authenticates via a completely separate JWT secret
(`PLATFORM_JWT_SECRET`) and has no `organizationId` field at all.

## Relationships

- `Customer.leadId` optionally references `Lead._id` (see `.ai/BE/features/customer-management.md`), set
  when a customer is created via `POST /api/leads/:id/convert`.
- `Project.customerId` **required**-references `Customer._id` (see `.ai/BE/features/project-management.md`),
  validated to exist at create time.
- `Quotation.leadId` **required**-references `Lead._id` (see `.ai/BE/features/quotation-management.md`),
  also validated to exist at create time.
- `Project.projectManagerId` / `Project.supervisorId` / `Worker.assignedProjectId` are intended references to
  `User._id`/`Project._id` respectively, all unvalidated.
- All of the above are stored as plain strings, not Mongoose `ref`/`ObjectId` relations, so there's no
  `.populate()` support anywhere — callers needing related-entity details must fetch them separately by id.
- `User` isn't referenced by any collection with an enforced check. All nine business/config collections
  are linked to their tenant via `organizationId`, which is a real, per-document `Organization.slug` as
  of 2026-08-27 — not the shared constant it was before (see `.ai/BE/features/multi-tenancy.md`). None of
  these are Mongoose `ref`s to `Organization._id` either — same plain-string convention as every other
  cross-collection reference in this app.
- `Quotation` references `Lead` directly, not `Customer`/`Project` — a quotation is issued during the lead
  pipeline (before conversion), so there is currently no path from a `Project` to its originating
  quotation(s) other than via the shared `Lead`.
- `Worker` has no required foreign key at all — it's linked to a project only via the optional, unvalidated
  `assignedProjectId`.
- `MaterialRequest.materialId` **required**-references `Material._id` (see
  `.ai/BE/features/material-inventory-management.md`), validated to exist at create time.
  `MaterialRequest.projectId` is an intended `Project._id` reference, unvalidated (same gap as
  `Worker.assignedProjectId`).
- `Permission` doesn't reference any document — `role`/`resource` are both closed enum values, not foreign
  keys to another collection's `_id`. It's the one collection in this app that isn't "about" a business
  record; it's configuration read by `PermissionsGuard` on every protected request. See
  `.ai/BE/features/permissions.md`.

## Indexes

**2026-08-24:** every collection now has explicit indexes matching its service layer's actual query
patterns (added as part of `.ai/BE/features/production-hardening.md`; verified live via
`db.<collection>.getIndexes()` and one `explain('queryPlanner')` confirming `IXSCAN` not
`COLLSCAN`):

- `User.email` — unique index (`@Prop({ required: true, unique: true, lowercase: true })`), unchanged.
- `Permission` — unique compound index on `{ role, resource, organizationId }`, unchanged. Doubles as
  the exact shape of the guard's hot-path lookup query.
- `Lead`, `Project`, `Quotation`, `Worker` — `{ organizationId: 1, createdAt: -1 }` (their `list()`'s
  exact filter/sort).
- `Customer` — `{ organizationId: 1, createdAt: -1 }` plus `{ leadId: 1 }` (`sparse`, not `unique`
  — a leadId is only present on converted customers; not unique because the lead-conversion
  race-loser should surface as `LeadsService`'s clean `409 ConflictException`, not a raw driver
  `E11000` error. `findByLeadId()` is now `organizationId`-scoped too, as of the 2026-08-27
  multi-tenancy retrofit, but the index leads with `leadId` since that's the more selective field).
- `Material` — `{ organizationId: 1, createdAt: -1 }` plus `{ organizationId: 1, name: 1 }` (serves
  `lowStock()`'s `sort({name:1})` — the `$expr` compare itself still can't be index-served, but this
  avoids an in-memory sort of the matched set).
- `MaterialRequest` — `{ organizationId: 1, createdAt: -1 }`, `{ organizationId: 1, projectId: 1,
  createdAt: -1 }`, `{ organizationId: 1, status: 1, createdAt: -1 }` (matches `list()`'s exact
  `{ organizationId, projectId?, status? }` filter).
- `User` — additionally `{ organizationId: 1, role: 1, createdAt: -1 }` (serves `?role=`, used by
  `/projects`'s Manager/Supervisor pickers).
- `Organization` (added 2026-08-27) — `{ slug: 1 }` unique (from `@Prop({unique:true})` — the guard's
  hot-path lookup and every business query's tenant key), `{ status: 1, createdAt: -1 }` (serves the
  platform admin's status-filtered org list).
- `PlatformAdmin` (added 2026-08-27) — `{ email: 1 }` unique, its own uniqueness domain.
- **Deliberately not indexed:** `Quotation.leadId`, `Worker.assignedProjectId`,
  `MaterialRequest.materialId` — no service method filters on them today; an index with no matching
  query is pure write-amplification. `MaterialsService.lowStock()`'s `$expr` comparison
  (`stockQuantity <= reorderLevel`) itself is still unindexed (field-to-field compares can't be
  index-served) — fine at catalog-sized scale, would need a different approach (e.g. a maintained
  boolean flag) if the catalog grows large. Deep `skip()`-based pagination is also unchanged — still
  O(skip) for far-out pages of a very large collection.

## ER diagram

```mermaid
erDiagram
    USER {
        ObjectId _id
        string name
        string email
        string password
        string role
        string organizationId
        boolean active
        Date createdAt
        Date updatedAt
    }
    LEAD {
        ObjectId _id
        string name
        string phone
        string email
        string source
        string status
        string organizationId
        string notes
        Date createdAt
        Date updatedAt
    }
    CUSTOMER {
        ObjectId _id
        string name
        string phone
        string email
        string address
        string leadId
        string organizationId
        string notes
        Date createdAt
        Date updatedAt
    }
    PROJECT {
        ObjectId _id
        string name
        string customerId
        string stage
        string projectManagerId
        string supervisorId
        number budget
        Date startDate
        Date endDate
        number progressPercent
        string organizationId
        string notes
        Date createdAt
        Date updatedAt
    }
    QUOTATION {
        ObjectId _id
        string leadId
        QuotationLineItem[] lineItems
        number taxPercent
        number discountPercent
        number subtotal
        number discountAmount
        number taxAmount
        number total
        string notes
        string terms
        string organizationId
        Date createdAt
        Date updatedAt
    }
    WORKER {
        ObjectId _id
        string name
        string phone
        string skillCategory
        number dailyWage
        string availabilityStatus
        string assignedProjectId
        number rating
        string organizationId
        string notes
        Date createdAt
        Date updatedAt
    }
    MATERIAL {
        ObjectId _id
        string name
        string category
        string unit
        number unitPrice
        number stockQuantity
        number reorderLevel
        string organizationId
        string notes
        Date createdAt
        Date updatedAt
    }
    MATERIAL_REQUEST {
        ObjectId _id
        string projectId
        string materialId
        number quantity
        string status
        string requestedBy
        string organizationId
        string notes
        Date createdAt
        Date updatedAt
    }
    PERMISSION {
        ObjectId _id
        string role
        string resource
        string organizationId
        boolean canView
        boolean canWrite
        boolean canDelete
        Date createdAt
        Date updatedAt
    }
    ORGANIZATION {
        ObjectId _id
        string name
        string slug
        string status
        string contactEmail
        string contactPhone
        string ownerUserId
        Date trialStartsAt
        Date trialEndsAt
        Date approvedAt
        string approvedBy
        Date rejectedAt
        string rejectionReason
        Date suspendedAt
        string suspensionReason
        Date createdAt
        Date updatedAt
    }
    PLATFORM_ADMIN {
        ObjectId _id
        string name
        string email
        string password
        boolean active
        Date createdAt
        Date updatedAt
    }
    LEAD ||--o| CUSTOMER : "converts to (via leadId, not a real FK)"
    CUSTOMER ||--o{ PROJECT : "has (via customerId, not a real FK, but validated on create)"
    LEAD ||--o{ QUOTATION : "has (via leadId, not a real FK, but validated on create)"
    PROJECT ||--o{ WORKER : "assigned to (via assignedProjectId, not a real FK, unvalidated)"
    PROJECT ||--o{ MATERIAL_REQUEST : "requests for (via projectId, not a real FK, unvalidated)"
    MATERIAL ||--o{ MATERIAL_REQUEST : "requested (via materialId, not a real FK, but validated on create)"
    ORGANIZATION ||--o{ USER : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ LEAD : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ CUSTOMER : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ PROJECT : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ QUOTATION : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ WORKER : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ MATERIAL : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ MATERIAL_REQUEST : "owns (via organizationId = slug, not a real FK)"
    ORGANIZATION ||--o{ PERMISSION : "owns (via organizationId = slug, not a real FK)"
```

`PERMISSION` is keyed by the `Role`/`Resource` enum values themselves within an org, not by a document
reference to another business entity. `PLATFORM_ADMIN` is deliberately disconnected from every other
entity — it has no `organizationId` at all and authenticates via a separate JWT secret; see
`.ai/BE/features/platform-admin.md`.

No relationship is modeled between `USER` and any business entity other than `ORGANIZATION` in the
current schema (see Open questions) — `Project.projectManagerId`/`supervisorId` are intended `User`
references but unvalidated. Every `ORGANIZATION ||--o{ X` edge above uses the same real link: `X.organizationId
== ORGANIZATION.slug`, enforced (`required: true`) as of the 2026-08-27 multi-tenancy retrofit, but still
a plain string, not a Mongoose `ref` to `Organization._id`.

## Planned entities (not yet implemented)

Per `.ai/PRODUCT_SPEC.md`, these entities are implied by planned modules but have **no schema, no code** —
listed here only so the eventual data model isn't designed from scratch, not as a commitment to exact field
names/types. See each module's feature file for the source module and open design questions.

| Entity | Planned module | Feature doc |
|---|---|---|
| `Supplier` | Module 8 | `.ai/BE/features/supplier-management.md` |
| `Expense` | Module 9 | `.ai/BE/features/expense-management.md` |
| `Invoice` / `Payment` | Module 10 | `.ai/BE/features/billing-payments.md` |
| `SiteReport` | Module 11 | `.ai/BE/features/daily-site-reports.md` |

None of these appear in the ER diagram above — that diagram reflects only what's actually implemented.

## Open questions

- Should `Lead` have an owning/assigned `User` reference? No such field exists today, so leads cannot be
  attributed to a sales rep in the data model. **Status: still undecided** — confirmed as unresolved on
  2026-08-08.
- Should `role` and `status` be constrained to their respective enums at the Mongoose schema level
  (`enum: Object.values(Role)`) rather than being open strings? **Status: still undecided for the existing
  schemas** — confirmed as unresolved on 2026-08-08. Note: `Permission.role`/`resource` (added 2026-08-08)
  *are* enum-constrained, the first schema in the app to be — see that entity's notes above for why the
  stakes were judged different there. This doesn't resolve the question for `User.role`/`Lead.status`/
  `Project.stage`/etc., just establishes that the pattern is available and already used once.
