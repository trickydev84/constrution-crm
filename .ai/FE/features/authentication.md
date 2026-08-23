# Authentication (FE)
**Status:** shipped | **Last verified:** 2026-08-08

## Summary

Login flow and client-side session storage for staff accounts. **Login-only, no signup UI** — this dashboard
is for staff (`ADMIN`/`SALES`/`PROJECT_MANAGER`/`SUPERVISOR`/`ACCOUNTANT`), who only exist via the backend's
startup seeder (see `.ai/BE/features/user-accounts.md`). `POST /api/auth/register` always creates a
`CUSTOMER` account (see `.ai/BE/features/auth.md`) intended for the not-yet-built customer portal, so there's
deliberately no "sign up" link anywhere in this app.

## User-facing behaviour

- `/login` — email + password form (shadcn `Card`/`Input`/`Label`/`Button`). On success, stores the JWT and
  user summary, then redirects to `/`. On failure (wrong credentials, or a validation error like a too-short
  password), shows the backend's error message as a `sonner` toast (changed 2026-08-08 from inline text as
  part of the visual redesign — see `.ai/FE/ARCHITECTURE.md`).
- `/` (dashboard) — on mount, checks for a stored session; if none, redirects to `/login`. If present, shows
  the real logged-in user's name and role in the sidebar profile (replacing the old hardcoded "Arjun
  Sharma / Administrator"), and a working "Logout" via a dropdown menu on the profile block.
- Session persists across page reloads (stored in `localStorage`, not just in-memory React state).
- **Any authenticated API call that comes back `401` auto-clears the session and redirects to `/login`**
  (added 2026-08-08, `frontend/src/lib/api.ts`) — see Known gaps for the incident that motivated this.

## Key files

- `frontend/src/lib/auth.ts` — `getToken()`, `getUser()`, `setSession()`, `clearSession()`. All
  `localStorage`-backed, guarded with `typeof window === 'undefined'` checks so they don't throw during
  Next.js's server-side render pass (see `.ai/FE/ARCHITECTURE.md`).
- `frontend/src/lib/api.ts` — `login()` plus the shared `request()` helper that every other API call goes
  through; automatically attaches `Authorization: Bearer <token>` from `getToken()` when present.
- `frontend/src/app/login/page.tsx` — the login form; a Client Component (`'use client'`) since it needs
  `useState`/`useRouter` and browser storage access. Built from shadcn `Card`/`Input`/`Label`/`Button` +
  `lucide-react` icons; errors reported via `sonner`'s `toast.error()`.
- `frontend/src/app/page.tsx` — the dashboard; also converted to a Client Component for the same reason.
  Auth check lives in a `useEffect` on mount (see `.ai/FE/ARCHITECTURE.md` for why this isn't middleware- or
  cookie-based).

## Data / API touchpoints

- `POST /api/auth/login` (`.ai/BE/features/auth.md`) — the only backend endpoint this feature calls.
- Every other authenticated API call (`.ai/BE/API.md`) depends on the token this feature stores.

## Dependencies

- `.ai/BE/features/auth.md` (the backend auth endpoints and global guard this is wired against).

## Known gaps & TODOs

- **`localStorage`, not cookies** — chosen because the backend issues a bearer token designed for an
  `Authorization` header, not a cookie, and adding cookie-based sessions would require backend changes
  (`Set-Cookie`, CSRF considerations) that weren't part of this pass. This means: no SSR-rendered
  authenticated content (every protected page is client-rendered), and no `middleware.ts`-based route
  protection (Next.js middleware runs on the edge and can't read `localStorage`).
- **Auth check happens after mount, not before render** — there's a brief `"Loading…"` state
  (`frontend/src/app/page.tsx`'s `checking` state) rather than an instant redirect, since the check can only
  run client-side after hydration. Not a security boundary — a user with dev tools open could see the DOM
  structure of `/` before the redirect fires, though the guard runs before any real data is fetched, since
  `refreshLeads()` is only called after the auth check passes. Real protection is still the backend's
  `JwtAuthGuard` — the frontend guard is UX-only, not a security control.
- **Resolved 2026-08-08, after a real incident:** the 15-minute JWT (`JWT_EXPIRES_IN`) expired mid-session
  during manual testing, and — separately — a bug in the redesigned user-menu dropdown (`DropdownMenuLabel`
  used without its required `DropdownMenuGroup` wrapper; see `.ai/FE/ARCHITECTURE.md`) had broken Logout at
  the same time. The combination trapped the user: expired token, every API call `401`ing, no way back to
  `/login`. Both are fixed — the dropdown structural bug, and `lib/api.ts` now auto-redirects to `/login` on
  any authenticated `401` (see User-facing behaviour above) so an expired token can't trap anyone this way
  again, even if some future bug breaks Logout again.
- Still no proactive token refresh — the session simply ends at 15 minutes and the user re-logs-in; there's
  no warning before it happens or silent refresh to extend it.
- No "remember me" / session-length control, no password reset link (matches the backend not having one
  either — see `.ai/BE/features/auth.md`).

## Open questions

- Should there be a token-expiry warning (e.g. a toast a minute before expiry) rather than just failing the
  next API call? Low priority given sessions are short-lived and re-login is now fast/automatic-redirect.
