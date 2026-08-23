# Material & inventory management
**Status:** shipped (core) | **Last verified:** 2026-08-09

## Summary

Module 7 of `.ai/PRODUCT_SPEC.md` — the first Phase 2 module. Two collections in one `materials` module:
a `Material` catalog (name, category, unit, price, stock, reorder level) and a `MaterialRequest` workflow
(a project requests a quantity of a material; SUPERADMIN/whoever has `MATERIALS:write` approves, rejects, or
fulfills it — fulfilling atomically decrements the material's stock). Scope was chosen via an explicit
three-way fork with the user ("catalog only" vs. "catalog + requests" vs. "per-project stock") — they picked
**catalog + stock + project material requests**, centralized (not per-project) stock, matching this project's
single-organization design.

## User-facing behaviour

- `GET /api/materials` — paginated catalog list.
- `GET /api/materials/low-stock` — plain array (not paginated, like `GET /api/permissions`) of materials
  where `stockQuantity <= reorderLevel`. This is the PRD's "low-stock alerts" feature — a query, not a
  push/email notification (no notification infrastructure exists in this app).
- `GET /api/materials/:id`, `POST /api/materials`, `PATCH /api/materials/:id` — standard catalog CRUD, no
  delete (matches every other module's convention). `PATCH` includes `stockQuantity` for direct corrections
  (e.g. a manual stock audit) — the normal way stock decreases is fulfilling a request, below.
- `GET /api/material-requests` (paginated, optional `?projectId=`/`?status=` filters), `GET
  /api/material-requests/:id`, `POST /api/material-requests` — creates a request in `REQUESTED` status;
  `materialId` must reference an existing material (`404` if not).
- `PATCH /api/material-requests/:id/approve` — `REQUESTED → APPROVED` only. No stock effect.
- `PATCH /api/material-requests/:id/reject` — `REQUESTED` or `APPROVED` → `REJECTED`. Fails (`400`) if
  already `FULFILLED` or `REJECTED`.
- `PATCH /api/material-requests/:id/fulfill` — `APPROVED → FULFILLED`, and **atomically** decrements the
  material's `stockQuantity` by the requested quantity via a single conditional `findOneAndUpdate` (`{
  stockQuantity: { $gte: quantity } }`), not a read-then-write — two concurrent fulfillments against the same
  low-stock material can't both pass a stale check and drive stock negative. Fails with `400` if stock is
  insufficient *at fulfillment time*, even if it was sufficient when the request was created/approved (stock
  is a shared pool other requests can drain in the meantime). Fails with `400` if the request isn't
  currently `APPROVED` (blocks fulfilling twice — no double-decrement — and blocks fulfilling before
  approval).
- All routes require `MATERIALS:view`/`write` via `@RequirePermission` — **one resource for both the catalog
  and the request workflow**, not two, since requests are part of the same domain (mirrors how one
  `WORKERS` resource covers the whole worker domain, not a split).

## Key files

- `backend/src/modules/materials/material.constants.ts` — `MATERIAL_CATEGORIES` (`CEMENT, SAND, STEEL,
  BRICKS, MARBLE, TILES, PAINT, OTHER`) and `MATERIAL_REQUEST_STATUSES` (`REQUESTED, APPROVED, FULFILLED,
  REJECTED`). Neither is PRD-specified as a fixed enum — both are reasonable defaults invented for this
  module, same precedent as `worker.constants.ts`'s skill categories.
- `backend/src/modules/materials/material.schema.ts` / `material-request.schema.ts` — plain Mongoose schemas,
  `status`/`category` are **not** Mongoose-`enum`-constrained (validated at the DTO layer via
  `class-validator`'s `@IsIn()` instead) — matches the dominant convention in this app (`Lead.status`,
  `Project.stage`), not the stricter one used for `Permission.role`/`resource`. `MaterialRequest.projectId` is
  a plain string, not validated against `Projects` — matches `Worker.assignedProjectId`'s documented gap.
- `backend/src/modules/materials/materials.service.ts` — `list()`, `lowStock()` (Mongo `$expr: { $lte:
  ['$stockQuantity', '$reorderLevel'] }`), `findById()`, `create()`, `update()`, and `decrementStock()` — the
  atomic conditional decrement described above.
- `backend/src/modules/materials/material-requests.service.ts` — `list()` (with optional `projectId`/`status`
  filter), `findById()`, `create()` (validates `materialId` exists), `approve()`/`reject()`/`fulfill()` — each
  its own named method with its own transition guard, mirroring `LeadsService.convertToCustomer()`'s rigor
  (real guards, real exceptions) rather than `LeadsService.updateStatus()`'s no-guard direct set, since
  fulfilling has a real cross-collection side effect. Depends on `MaterialsService` for the stock read/write.
- `backend/src/modules/materials/materials.controller.ts` (`/materials`, `/materials/low-stock`) and
  `material-requests.controller.ts` (`/material-requests`, plus `/:id/approve`, `/:id/reject`,
  `/:id/fulfill`) — **`@Get('low-stock')` is declared before `@Get(':id')`** in the controller; Nest matches
  routes in registration order, so this ordering is load-bearing, not cosmetic.
- `backend/src/modules/materials/materials.module.ts` — one `MaterialsModule` registers both schemas, both
  services, both controllers. First module in this app with more than one schema/service/controller triple —
  see `modules/README.md`.
- `backend/src/common/contracts/index.ts` — `Resource` enum gained `MATERIALS`.
- `backend/src/modules/permissions/permissions.service.ts` — `DEFAULT_MATRIX` gained one row:
  `{SUPERADMIN, MATERIALS, V+W+D}` (cosmetic, like every other SUPERADMIN row — bypass makes it informational
  only; every non-SUPERADMIN role has zero grants by default, same as every other resource — see
  `.ai/BE/features/permissions.md`).
- `frontend/src/app/permissions/page.tsx`'s `RESOURCES` constant and `frontend/src/components/app-sidebar.tsx`'s
  `NAV_ITEMS` "Materials" entry were updated in the same pass to reference the new resource — see
  `.ai/FE/features/permissions.md` and `.ai/FE/features/dashboard-shell.md`. No Materials frontend *page*
  was built this pass (backend-only, matching how Projects/Quotations/Workers shipped backend-first).

## Data / API touchpoints

- `Material`/`MaterialRequest` collections in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Feeds into `.ai/BE/features/supplier-management.md` (Phase 2, not yet built — purchases would restock
  `Material.stockQuantity`) and `.ai/BE/features/daily-site-reports.md` (Phase 2, not yet built — material
  consumed per day per project would likely read from `MaterialRequest`).
- Verified live via a throwaway Node script against the running backend (not just `tsc --noEmit`): granted
  `PROJECT_MANAGER` temporary `MATERIALS`/`PROJECTS`/`CUSTOMERS` grants, created a material + customer +
  project, then ran 18 assertions covering: create material (`201`), low-stock listing includes a
  below-reorder material, invalid `category` rejected (`400`), requesting a nonexistent material (`404`),
  full request lifecycle (`REQUESTED → APPROVED → FULFILLED`), fulfilling before approval blocked (`400`),
  re-approving an already-approved request blocked (`400`), fulfilling with insufficient stock blocked
  (`400`, using a 999-quantity request against 10 in stock), stock correctly decremented (`10 → 5`),
  re-fulfilling an already-fulfilled request blocked with no double-decrement (stock still `5` after),
  rejecting an already-fulfilled request blocked (`400`), and `SALES` (no grant) denied `403` on
  `GET /materials`. All 18 passed. Test data (one material, one customer, one project, two material requests)
  and the temporary `PROJECT_MANAGER` grants were all removed afterward — the grants via the real `DELETE
  /api/permissions/...` endpoint, the documents directly from MongoDB (no delete endpoints exist for
  materials/customers/projects, matching the app-wide no-delete convention), confirmed back to a clean state.
  **No browser-driven verification** — no FE page exists yet to click through.

## Dependencies

- `.ai/BE/features/supplier-management.md` (material purchases come from suppliers — not yet built).
- `.ai/BE/features/project-management.md` (material requests reference a project).
- `.ai/BE/features/permissions.md` (every route gated on the new `MATERIALS` resource).

## Known gaps & TODOs

- **No frontend page.** Backend-only this pass, matching precedent (Projects/Quotations/Workers all shipped
  backend-first). `frontend/src/components/app-sidebar.tsx`'s "Materials" nav item is now permission-gated on
  the real `MATERIALS` resource but still has `href: null` (shows a "not built yet" toast).
- **Centralized stock, not per-project.** A user-directed decision — see Summary. If site-level stock
  tracking is ever needed, it would likely be a second `projectId`-scoped stock ledger rather than a rework
  of this schema, to avoid breaking the centralized-catalog use case.
- **`projectId`/`materialId` aren't validated to be well-formed ObjectIds consistently** —
  `CreateMaterialRequestDto.projectId` uses `@IsMongoId()`, but nothing checks the referenced *project*
  actually exists (matches `Worker.assignedProjectId`'s same documented gap) — a request can be created
  against a nonexistent (but well-formed) project id.
- **No purchase/restock endpoint yet.** `PATCH /materials/:id` can bump `stockQuantity` directly (a manual
  correction), but there's no dedicated "record a purchase" action with its own audit trail — that's
  `.ai/BE/features/supplier-management.md`'s job when it's built.
- **`requestedBy` is a free string, not validated** — no `GET /users` endpoint exists yet to check against
  (same gap flagged in `.ai/BE/features/project-management.md`'s dropped "Manager" column).
- **No unit standardization** — `unit` is free text per material (`"bag"`, `"kg"`, `"ton"`), so nothing
  prevents two materials of the same real-world category from using inconsistent units. Acceptable for a
  catalog this size; would need a controlled vocabulary if unit conversion/aggregation is ever needed.

## Open questions

- Should `MaterialRequest` eventually carry a `fulfilledAt`/`fulfilledBy` audit pair, or is `updatedAt` (from
  `timestamps: true`) sufficient once a real user-identity system exists to attribute it to?
- Should low-stock crossing a threshold trigger a real notification (email/in-app) once notification
  infrastructure exists anywhere in this app, or stay a pull-based `GET /materials/low-stock` query?
