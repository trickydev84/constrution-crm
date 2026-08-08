# Backend — Features index

Module numbers reference `.ai/PRODUCT_SPEC.md` §Functional modules. Phase 1 = MVP; Phase 2 = second wave
(inventory/procurement/finance/portal); Phase 3 = mobile/AI/automation (not tracked here — no backend work
yet); Phase 4 = multi-tenant SaaS (explicitly out of scope for now).

| Feature | Slug | Status | Owner area | Detail doc |
|---|---|---|---|---|
| Authentication (register/login, JWT issuance) | `auth` | in-progress | `modules/auth` | [features/auth.md](features/auth.md) |
| User accounts & startup seeding | `user-accounts` | shipped | `modules/users` | [features/user-accounts.md](features/user-accounts.md) |
| Lead management (list/create/update status) | `lead-management` | in-progress | `modules/leads` | [features/lead-management.md](features/lead-management.md) |
| Customer management | `customer-management` | planned | — | [features/customer-management.md](features/customer-management.md) |
| Project management | `project-management` | planned | — | [features/project-management.md](features/project-management.md) |
| Quotation management | `quotation-management` | planned | — | [features/quotation-management.md](features/quotation-management.md) |
| Worker management | `worker-management` | planned | — | [features/worker-management.md](features/worker-management.md) |
| Material & inventory management | `material-inventory-management` | planned | — | [features/material-inventory-management.md](features/material-inventory-management.md) |
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
