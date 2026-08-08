# Product spec reference (BRD + PRD, v1.0)

Condensed from the founder's Master Plan / BRD / PRD documents (shared 2026-08-08), scoped to what's relevant
to software planning. Marketing/brand-asset content (logos, uniforms, social media calendars, marketing
website copy) is intentionally omitted here — see Open questions below on whether the public marketing
website is in this repo's scope at all.

This file is the source for every `planned`-status feature in `BE/FEATURES.md` / `FE/FEATURES.md`. When a
module here gets built, update the matching feature file's status and stop citing this doc as the only
source of truth for it — the code becomes the source of truth per `.ai/INSTRUCTIONS.md`.

## Product vision

A technology-enabled construction company: a CRM/ERP for internal operations now, evolving into a
multi-tenant SaaS product for other contractors later (explicitly **out of scope for Phase 1** — see below).

## User roles (PRD Section 4)

| Role | Responsibilities per PRD |
|---|---|
| Administrator | Manage system, configure services, manage users/permissions, view reports |
| Sales Executive | Capture/manage leads, follow-ups, quotations, convert leads to projects |
| Project Manager | Create/oversee projects, assign supervisors, track progress/budget/timeline |
| Site Supervisor | Daily site reports, progress photos, worker attendance, material requests |
| Accountant | Invoices, payments, expenses, project finances |
| Customer | View progress, documents, quotations/invoices, payments, contact team |

Maps closely to the existing `Role` enum (`backend/src/common/contracts/index.ts`), which also has
`SUPERADMIN` (not mentioned in the PRD's role list — see Open questions).

## Phase 1 scope (MVP) — per BRD Section 4 and PRD Section 8

**In scope:** company website, lead management, customer management, project management, quotation/invoice
management, worker & supervisor management, material & supplier tracking, expense tracking, customer portal,
analytics dashboard.

**PRD's stricter MVP cut (Section 8):** user authentication, lead management, customer management, project
management, quotation generation, worker management, dashboard, basic reporting.

**Explicitly out of scope for Phase 1** (BRD Section 4):
- AI cost estimation / AI features generally
- Marketplace for contractors, supplier marketplace
- Public mobile applications
- Multi-company SaaS platform (multi-tenancy)

## Product roadmap phases (PRD Section 11)

| Phase | Contents |
|---|---|
| Phase 1 — MVP | Website, CRM core modules, dashboard, quotations, project tracking |
| Phase 2 | Inventory, procurement, finance, customer portal, advanced analytics |
| Phase 3 | Mobile applications, AI-powered estimation, automation workflows, notifications |
| Phase 4 | Multi-tenant SaaS, contractor onboarding, supplier ecosystem, marketplace integrations |

## Functional modules (PRD Section 5)

| # | Module | Target phase | Key features per PRD |
|---|---|---|---|
| 1 | Authentication & User Management | 1 | Secure login, RBAC, password reset, profile management, activity logs |
| 2 | Lead Management | 1 | Create/import leads, assign sales rep, status tracking, follow-up reminders, notes/attachments |
| 3 | Customer Management | 1 | Profiles, contact info, multi-project support, communication history, document storage |
| 4 | Project Management | 1 | Create project, assign PM/supervisor, milestones, progress, timelines, drawings/documents |
| 5 | Quotation Management | 1 | Materials + labor, taxes/discounts, PDF export, email/WhatsApp send, version history |
| 6 | Worker Management | 1 | Profiles, skill categories, daily attendance, wages, project assignment, availability |
| 7 | Material & Inventory Management | 2 | Catalog, stock management, material requests, purchase/usage tracking, low-stock alerts |
| 8 | Supplier Management | 2 | Supplier DB, purchase orders, delivery tracking, payment tracking, performance history |
| 9 | Expense Management | 2 | Record/categorize expenses, receipts, link to projects, monthly reports |
| 10 | Billing & Payments | 2 | Invoice generation, payment tracking, outstanding balances, payment history, GST support |
| 11 | Daily Site Reports | 2 | Work summary, photo/video uploads, attendance, material usage, issues/risks, next-day plan |
| 12 | Customer Portal | 2 | Project timeline, progress photos, documents, payment history, invoices, notifications, support requests |
| 13 | Dashboard & Analytics | 1 (basic) / 2 (advanced) | Leads, conversion rate, active/completed projects, revenue, profit margin, pending payments, worker utilization, material costs |

## Lead status flow (matches current code)

`New → Contacted → Site Visit → Quotation Sent → Negotiation → Won / Lost` — matches `LeadStatus` enum in
`backend/src/common/contracts/index.ts` and `backend/src/modules/leads/`.

## Project stage flow (not yet implemented)

`Planning → Foundation → Structure → Brickwork → Plumbing → Electrical → Flooring → Painting → Interior →
Inspection → Handover` — matches the existing `ProjectStage` enum in
`backend/src/common/contracts/index.ts`, which currently has no backing module.

## SOP workflows (Master Plan)

- **Lead flow:** Website → CRM → Sales Call → Site Visit → Estimate → Quotation → Negotiation → Project →
  Handover → Review → Referral.
- **Project flow:** Requirement Gathering → Site Visit → Estimate → Quotation → Agreement → Advance Payment →
  Execution → Quality Checks → Completion → Final Payment → Warranty.

## Non-functional requirements (PRD Section 6)

- **Security:** JWT auth, role-based authorization, encrypted passwords, audit logs, secure file storage.
- **Scalability:** modular architecture, RESTful APIs, cloud-ready deployment, future multi-tenant support
  (Phase 4, not now).
- **Reliability:** automated backups, error logging, monitoring/alerts.

## Suggested tech stack (PRD Section 7) vs. what's actually in the repo

| Area | PRD suggests | Currently in repo |
|---|---|---|
| Frontend | Next.js, React, **Tailwind CSS** | Next.js 15, React 19, plain hand-rolled CSS (no Tailwind) |
| Backend | NestJS, TypeScript | NestJS 11, TypeScript — matches |
| Database | MongoDB | MongoDB via Mongoose — matches |
| Auth | JWT | `@nestjs/jwt` present, but not enforced anywhere yet — see `.ai/BE/features/auth.md` |
| Storage | AWS S3 | Not integrated — no file upload code exists |
| Notifications | Email, WhatsApp, SMS (future) | Not integrated |
| Deployment | Docker, AWS, Vercel (frontend) | Dockerfiles exist for both; no AWS/Vercel config in repo |

## Success metrics / KPIs (PRD Section 10, Master Plan "Success Metrics")

Leads/month, lead-to-project conversion rate, monthly revenue, profit margin, on-time completion rate,
customer satisfaction, referral rate, website inquiry conversion, repeat-customer percentage, worker
utilization, material cost, average project value, cost per lead, average sales cycle, budget adherence.
None of these are currently computed anywhere in the backend — `Module 13 / Dashboard & Analytics` is fully
unimplemented server-side (the frontend dashboard is static mock data — see
`.ai/FE/features/dashboard-shell.md`).

## Open questions raised by this spec

- Is the public **marketing website** (Home/Services/Projects/About/Gallery/Reviews/Careers/Contact, per the
  Master Plan's Website Plan section) part of this same `frontend/` Next.js app, a separate site, or a
  separate repo entirely? Nothing in the current frontend suggests a marketing site — it's a single
  authenticated-feeling dashboard route.
- The PRD's role list omits `SUPERADMIN` (present in code). Is `SUPERADMIN` a superset of `Administrator`,
  or a distinct role the PRD hasn't caught up to?
- Multi-tenancy is explicitly Phase 4 / out of scope now, which matches the confirmed single-org design
  (see `.ai/PROJECT.md`) — no conflict, just noting it's consistent.
- Tailwind CSS is suggested but the current frontend uses plain CSS — is a migration to Tailwind wanted
  before more UI is built, or should plain CSS continue?
- AWS S3 / file storage: several PRD modules depend on file upload (documents, photos, drawings, receipts).
  No storage integration exists yet — needs a decision before Project/Quotation/Site-Report/Expense modules
  can fully match the spec.
