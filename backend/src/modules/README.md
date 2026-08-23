# Domain modules

Each business capability lives in its own NestJS module. Current modules are `auth`, `users`, `leads`,
`customers`, `projects`, `quotations`, `workers`, `materials`, and `permissions`; new capabilities should
follow the same module boundary with controllers, services, schemas, DTOs, and tests colocated inside the
module. `materials` is the first module with two schemas/services/controllers (`Material` catalog +
`MaterialRequest` workflow) sharing one Nest module — see `.ai/BE/features/material-inventory-management.md`
if a future module needs the same shape.

Any new controller must protect its routes with `@RequirePermission(Resource.X, 'view'|'write'|'delete')`
(`modules/auth/decorators/require-permission.decorator.ts`) and add the corresponding `Resource` value to
`common/contracts/index.ts` — see `modules/permissions/` and `.ai/BE/features/permissions.md`. The global
`JwtAuthGuard`/`RolesGuard`/`PermissionsGuard` chain is registered once in `modules/auth/auth.module.ts` and
applies automatically; a route with no `@RequirePermission()` is open to any authenticated user, which is
almost never what you want.
