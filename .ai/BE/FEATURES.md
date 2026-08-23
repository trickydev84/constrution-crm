# Backend — Features index

Module numbers reference `.ai/PRODUCT_SPEC.md` §Functional modules. Phase 1 = MVP; Phase 2 = second wave
(inventory/procurement/finance/portal); Phase 3 = mobile/AI/automation (not tracked here — no backend work
yet); Phase 4 = multi-tenant SaaS (explicitly out of scope for now).

| Feature | Slug | Status | Owner area | Detail doc |
|---|---|---|---|---|
| Authentication (register/login, JWT issuance) | `auth` | in-progress | `modules/auth` | [features/auth.md](features/auth.md) |
| Permissions (SUPERADMIN-configurable role/resource access) | `permissions` | shipped | `modules/permissions` | [features/permissions.md](features/permissions.md) |
| User accounts & startup seeding | `user-accounts` | shipped | `modules/users` | [features/user-accounts.md](features/user-accounts.md) |
| Lead management (list/create/update status/convert) | `lead-management` | in-progress | `modules/leads` | [features/lead-management.md](features/lead-management.md) |
| Customer management | `customer-management` | in-progress | `modules/customers` | [features/customer-management.md](features/customer-management.md) |
| Project management | `project-management` | in-progress | `modules/projects` | [features/project-management.md](features/project-management.md) |
| Quotation management | `quotation-management` | in-progress | `modules/quotations` | [features/quotation-management.md](features/quotation-management.md) |
| Worker management | `worker-management` | in-progress | `modules/workers` | [features/worker-management.md](features/worker-management.md) |
| Material & inventory management | `material-inventory-management` | shipped (core) | `modules/materials` | [features/material-inventory-management.md](features/material-inventory-management.md) |
| Supplier management | `supplier-management` | planned | — | [features/supplier-management.md](features/supplier-management.md) |
| Expense management | `expense-management` | planned | — | [features/expense-management.md](features/expense-management.md) |
| Billing & payments | `billing-payments` | planned | — | [features/billing-payments.md](features/billing-payments.md) |
| Daily site reports | `daily-site-reports` | planned | — | [features/daily-site-reports.md](features/daily-site-reports.md) |
| Customer portal (API) | `customer-portal` | planned | — | [features/customer-portal.md](features/customer-portal.md) |
| Dashboard & analytics (API) | `dashboard-analytics` | planned | — | [features/dashboard-analytics.md](features/dashboard-analytics.md) |

**Explicitly out of scope for now** (per BRD, `.ai/PRODUCT_SPEC.md`): AI features, contractor/supplier
marketplace, mobile-app backends, multi-tenant SaaS. Not tracked as `planned` rows until they enter an actual
phase plan.

`lead-management` status changed from `shipped` to `in-progress`: the shipped subset (list/create/status
update) works, but the PRD's fuller Module 2 scope (budget/location/timeline fields, lead source/assignment,
import, follow-up reminders, attachments) isn't built yet — see the detail doc's Known gaps.

**2026-08-08:** `auth` gained a global `JwtAuthGuard` + `RolesGuard` — every route in the app now requires
authentication by default (`leads` included). `register` now defaults new accounts to `CUSTOMER` instead of
`ADMIN`, closing the open privilege-escalation gap. Still `in-progress`: no per-route role restriction is
applied yet, no password reset/activity logs/profile management — see `features/auth.md`.

**2026-08-08:** `customer-management` shipped its core (list/create/get/update) plus a
`POST /leads/:id/convert` action on `lead-management` that creates a customer from a `WON` lead. Still
`in-progress`: documents, multi-project support, payments, and communication history (full PRD Module 3
scope) aren't built — see `features/customer-management.md`.

**2026-08-08:** All 10 existing endpoints (`auth`, `lead-management`, `customer-management`) are now fully
Swagger-documented — request DTOs, response DTOs, and error responses all present at `/docs` / `/docs-json`.
This is now a standing convention for every future endpoint (see project memory `feedback_swagger_docs` and
`.ai/BE/ARCHITECTURE.md`), not a one-time backfill.

**2026-08-08:** `project-management` shipped its core (list/create/get/update/stage-transition), with
`customerId` required and validated against `CustomersService` on create (`404` if the customer doesn't
exist). Fully Swagger-documented from the start, per the standing convention above. Still `in-progress`:
no team/worker assignment beyond PM/supervisor IDs (unvalidated), no milestones, no documents — see
`features/project-management.md`.

**2026-08-08:** `quotation-management` shipped its core (list/create/get/update) against `leadId` (required,
validated). Line items, tax, and discount are all computed server-side (discount-before-tax) and verified
correct against hand-calculated totals. `lead-management` gained a public `LeadsService.findById()` (now
exported) to support this. Still `in-progress`: no PDF export, no email/WhatsApp delivery, no version
history, no status/lifecycle field — see `features/quotation-management.md`.

**2026-08-08:** `worker-management` shipped its core (list/create/get/update/availability-transition), scoped
to the worker roster only — daily attendance logging deliberately deferred to Daily Site Reports (Phase 2) to
avoid modeling it twice. `skillCategory`/`availabilityStatus` are strictly `@IsIn(...)`-validated, unlike the
looser `Lead.status`/`Project.stage` fields. This completes every module in `.ai/PRODUCT_SPEC.md` Phase 1
except the standalone marketing website. See `features/worker-management.md`.

**2026-08-08: `permissions` shipped — a breaking change.** SUPERADMIN now controls, per role, whether each
of `leads`/`customers`/`projects`/`quotations`/`workers` can be viewed/written. Default is **deny**: every
route that was previously open to any authenticated user now requires an explicit grant. **As of 2026-08-08
(later, user-directed), the only role with any grants out of the box is SUPERADMIN** — the seed matrix's
starter grants for the other 6 demo roles were removed (both in code and in the live DB); each must be
granted access explicitly via `PATCH /api/permissions/:role/:resource` or the new SUPERADMIN-only FE
`/permissions` page (rationale and detail in `features/permissions.md`, `.ai/FE/features/permissions.md`).
This is a real behavior change to every existing endpoint's "Auth required" column in `.ai/BE/API.md`.
`RolesGuard`/`@Roles()` (previously dead code) are now formally superseded by
`PermissionsGuard`/`@RequirePermission()` — see `features/auth.md`.

**2026-08-09: `material-inventory-management` shipped its core — the first Phase 2 module.** A `Material`
catalog (name/category/unit/price/stock/reorder level) plus a `MaterialRequest` workflow (project requests a
quantity → `REQUESTED → APPROVED → FULFILLED`/`REJECTED`, fulfilling atomically decrements stock). User chose
**centralized stock + project material requests** over a catalog-only or per-project-stock alternative (a
genuine 3-way fork, resolved via `AskUserQuestion`). Gated on a new `MATERIALS` resource — one resource for
both the catalog and the request workflow. First module in this app with two schemas/services/controllers
sharing one Nest module. Verified live with an 18-assertion Node script (create/low-stock/invalid-category/
full request lifecycle/insufficient-stock/no-double-decrement/permission-denial), all passed; test data and
temporary grants cleaned up afterward. Still `in-progress` toward full Module 7 PRD scope: no frontend page,
no purchase/restock endpoint (that's Supplier Management's job), no per-user audit trail on
approve/reject/fulfill — see `features/material-inventory-management.md` Known gaps.

**2026-08-10: `user-accounts` gained its first public HTTP surface.** `GET /api/users` (paginated,
optional `?role=` filter) and `GET /api/users/:id` — read-only, no create/update/delete route. Both
explicitly exclude the password hash at the query level (`.select('-password')`), not just from the
response DTO. New `Resource.USERS`, gated the same way as every other resource (SUPERADMIN seeded, every
other role at zero by default). Built specifically to unblock the FE's dropped "Manager" column and richer
role-based pickers — not wired into any FE page in this pass. Verified live: 9/9 assertions (shape, no
password on any record, role filter, get-by-id, permission denial for a role with no `USERS` grant,
Swagger spec correctness) all passed. See `features/user-accounts.md`.
