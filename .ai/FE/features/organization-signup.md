# Organization signup & pending approval (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-27

## Summary

Two new pages supporting the backend's multi-tenancy Stage 1 (`.ai/BE/features/multi-tenancy.md`):
`/signup` lets anyone create a brand-new organization; `/pending` is the holding screen a user sees
whenever their organization isn't `ACTIVE` yet (or no longer is). Neither touches `AppSidebar` or the
dashboard shell — both are standalone, matching `/login`'s existing pattern.

## User-facing behaviour

- **`/signup`** — organization name, a slug (auto-derived from the name via a client-side `slugify()`,
  editable — once the user types into the slug field directly it stops auto-deriving), admin
  name/email/password, optional phone. Same regex shown inline as the backend enforces
  (`^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$`), with the submit button disabled if it doesn't match. On
  success (`201`), routes straight to `/pending` — no token is returned by the backend, so there's
  nothing to store yet; the user logs in normally once approved.
- **`/pending`** — reached two ways: right after signup, and via `lib/api.ts`'s new 403-code redirect
  (any org-scoped call failing with `code` starting `ORGANIZATION_`). Calls `GET /organizations/me` on
  mount and renders one of three states by `status`:
  - `PENDING` — "awaiting review," plus the trial length once approved (computed client-side from
    `trialEndsAt`), if the org has one.
  - `SUSPENDED` — contact-the-admin message.
  - `REJECTED` — contact-the-admin message.
  If the fetched status is `ACTIVE` (e.g. the user was approved in another tab), redirects to `/`
  instead of rendering a stale holding screen. Includes a Logout action (reuses `lib/auth.ts`'s
  `clearSession()`).

## Key files

- `frontend/src/app/signup/page.tsx` — the whole signup form. Client Component, mirrors
  `login/page.tsx`'s single shadcn `Card` layout exactly.
- `frontend/src/app/pending/page.tsx` — the three-state holding screen, keyed by a small
  `CONTENT: Record<status, {...}>` lookup table rather than nested conditionals.
- `frontend/src/lib/api.ts` — `signupOrganization()`, `getMyOrganization()` (new); `LoginResponse`
  type gained `organization: LoginOrganization | null`; the shared `request()` helper's error
  handling gained the 403-`ORGANIZATION_*` → `/pending` redirect, placed right beside the existing
  401 → `/login` redirect (same file, same pattern, `window.location.assign`, guarded by
  `window.location.pathname !== '/pending'` so the redirect can't loop against itself).
- `frontend/src/lib/auth.ts` — `AuthUser` gained `organizationId`.
- `frontend/src/app/login/page.tsx` — gained a "Create an organization" link to `/signup`; the login
  success handler now checks `res.organization?.status !== 'ACTIVE'` and routes to `/pending` instead
  of `/` when true, avoiding a wasted round-trip through the dashboard's own data-fetching hitting a
  403 first.

## Data / API touchpoints

- `POST /api/organizations/signup` (`.ai/BE/features/multi-tenancy.md`) — public, no auth.
- `GET /api/organizations/me` — authenticated but works for any org status (the one route exempted
  from the backend's active-org check).
- Indirectly, every other org-scoped endpoint's `403 ORGANIZATION_*` response — this is what the
  `/pending` redirect reacts to.

## Dependencies

- `.ai/BE/features/multi-tenancy.md` — the backend signup/status endpoints and the `code` field
  contract this page's redirect logic depends on.
- `.ai/FE/features/authentication.md` — session storage (`lib/auth.ts`) `/pending` reads from.

## Known gaps & TODOs

- No email verification step — signup is immediately submitted with no confirmation loop.
- No live/polling update on `/pending` — a user approved while the tab is open must refresh (or
  trigger any API call, which then 403s differently once active) to notice; no websocket/polling.
- Trial-length display on the `PENDING` state is informational only — nothing in the FE enforces or
  counts down a trial (matches the backend, where trial dates are recorded but not enforced yet,
  Stage 2).
- No browser-driven verification — matches every other page in this project; verified instead by a
  Node script simulating the exact call sequence each page makes (`.ai/BE/features/multi-tenancy.md`'s
  "Verified live" note references the same underlying script).

## Open questions

None outstanding for this pass — see `.ai/BE/features/multi-tenancy.md`'s Open questions for the
backend-level ones (e.g. whether `ALLOW_PUBLIC_REGISTRATION` should ever default on).
