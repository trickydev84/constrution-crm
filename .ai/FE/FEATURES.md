# Frontend — Features index

| Feature | Slug | Status | Owner area | Detail doc |
|---|---|---|---|---|
| Dashboard shell (static mock UI) | `dashboard-shell` | in-progress | `src/app/page.tsx` | [features/dashboard-shell.md](features/dashboard-shell.md) |
| Customer portal (UI) | `customer-portal` | planned | — | [features/customer-portal.md](features/customer-portal.md) |

**Not yet implemented:** internal-facing pages for every backend module in `.ai/BE/FEATURES.md` (Leads,
Customers, Projects, Quotations, Workers, Materials, Suppliers, Expenses, Billing, Site Reports) — the
sidebar in `dashboard-shell` has nav entries for several of these but no routes exist. No login/auth screen
exists despite the backend exposing `/api/auth/*`.

**Out of scope for this repo (open question, see `.ai/PRODUCT_SPEC.md`):** the public marketing website
(Home/Services/Projects/About/Gallery/Reviews/Careers/Contact) described in the Master Plan may belong to a
separate site/repo — nothing in the current `frontend/` app is a public marketing page.
