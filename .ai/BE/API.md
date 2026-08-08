# Backend — API reference

All routes are prefixed with `/api` (set in `backend/src/main.ts`). Swagger UI is live at `/docs` when the
server is running. A global `JwtAuthGuard` requires a valid `Authorization: Bearer <token>` on every route
except those marked `@Public()` — see `.ai/BE/features/auth.md`. No route yet restricts by role
(`RolesGuard`/`@Roles()` exist but aren't applied anywhere).

| Method | Path | Auth required | Request body | Response | Error cases | Source |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | No (`@Public()`) | `{ name: string, email: string, password: string (min 8) }` — `role` is not accepted from the client, always created as `CUSTOMER` | `201 { accessToken: string, user: { id, name, email, role: "CUSTOMER" } }` | `401` if email already registered | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts` |
| POST | `/api/auth/login` | No (`@Public()`) | `{ name: string, email: string, password: string (min 8) }` (DTO reuses `AuthDto`; `name` is accepted but unused for login) | `200 { accessToken: string, user: { id, name, email, role } }` | `401` if user not found or password mismatch | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts` |
| GET | `/api/leads` | **Yes** (any authenticated role) | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 { data: Lead[], meta: { page, limit, total } }` | `401` if token missing/invalid | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts` |
| POST | `/api/leads` | **Yes** (any authenticated role) | `{ name: string, phone: string, email?: string, source?: string, notes?: string }` | `201` created `Lead` document | `401` if token missing/invalid; `400` if `name`/`phone` missing | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts` |
| PATCH | `/api/leads/:id/status` | **Yes** (any authenticated role) | `{ status: string }` (not enum-validated) | `200` updated `Lead` document (or `null` if `id` not found) | `401` if token missing/invalid; no explicit 404 handling — returns `null` body if not found | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts` |

## Notes

- Global `ValidationPipe` (`whitelist: true, transform: true`) strips unknown fields and coerces payloads to
  the DTO classes shown above (`backend/src/main.ts`).
- Global `JwtAuthGuard` + `RolesGuard` (`backend/src/modules/auth/auth.module.ts`) enforce authentication on
  every route by default; a `401` response of `{"message":"Missing access token", ...}` or
  `{"message":"Invalid or expired access token", ...}` means the guard rejected the request before it reached
  the controller.
- Responses are **not** wrapped in the `ApiResponse<T>` / `ApiError` shapes defined in
  `backend/src/common/contracts/index.ts` except where the shape happens to match (`GET /api/leads`) —
  see `.ai/BE/ARCHITECTURE.md` "No response envelope in use".
- CORS is fully open (`origin: true`) — no origin allow-list is configured.
