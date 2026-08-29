# Design system (Phase 1 of the Claude Design mockup implementation)
**Status:** shipped (core) | **Last verified:** 2026-08-29

## Summary

A full visual-system replacement, sourced directly from UI mockups the user made in Claude Design
(`claude.ai/design`, project `03f837c7-05c3-4079-9cdf-2bb9d4e31f2d`, file `Construction CRM
Mockups.dc.html`) and imported via the `DesignSync` MCP tool. This is Phase 1 of a 7-phase plan (see
the plan file used to build this pass, and `FEATURES.md`'s "Not yet implemented" note) — **mechanical
only**: every existing route was restyled in place, zero new features, zero new endpoints, zero new
routes. Phases 2–7 (Dashboard/Leads redesign, Job detail + billing, Suppliers/POs, Schedule, Reports,
Quotation wizard) build new functionality on top of this foundation and are not part of this pass.

Replaces the previous navy+gold theme (`--primary:#14283f`, `--brand-gold:#d8a94a`, Geist font) —
see `.ai/FE/ARCHITECTURE.md`'s "Styling architecture" section, now rewritten to describe this system
instead.

## User-facing behaviour

- **Single accent** (`#1B6CA8`, hover `#155a8c`) used for navigation-active state and primary actions
  only — the old gold accent (logo "ly", header sparkle, login/sidebar wordmark) is gone entirely, not
  replaced with anything decorative.
- **Dark navy sidebar** (`#0f1b26`) in both light and dark theme — the sidebar doesn't follow the
  page's light/dark toggle, matching the mockup. Hover and active nav items now render with visibly
  different backgrounds (`rgba(255,255,255,.07)` vs `rgba(27,108,168,.22)`) — previously both states
  shared shadcn's single `--sidebar-accent` token, so this needed a per-usage className override, not
  just a token value change (see Key files).
- **Archivo** (variable weight) for all interface text, **IBM Plex Mono** for every number, ID, date,
  and currency figure across all 12 routes — applied via `font-mono tabular-nums` at each figure's
  usage site, not globally, since body text stays Archivo.
- **Status color vocabulary** — green/amber/red/blue (`good`/`warn`/`bad`/`info`) — replaces the
  ad-hoc `emerald-50`/`sky-50`/`amber-50`/etc. Tailwind classes that were hand-picked per page
  (inconsistent hues for the same meaning across Leads/Workers/Materials/Platform admin). Every status
  badge on every page now draws from the same 4 semantic tokens.
- **Currency formatting** is now centralized and dual-mode: exact grouped rupees (`formatINR`,
  unchanged behavior) for tables/dialogs, with a new compact form (`formatCompactINR`, ₹81.0L/₹4.7Cr)
  available for future dashboard work — not yet used in this phase, since the existing dashboard
  metric cards already show exact values and changing that display *behavior* is Phase 2's job, not
  this mechanical pass's.
- No behavior changes: every create/edit/status-transition flow, permission gate, and API call is
  byte-for-byte the same as before this pass.

## Key files

- `frontend/src/app/styles.css` — full token replacement. New tokens: `--color-status-{good,warn,bad,
  info}-{fg,bg}`, `--color-text-{subtle,body,faint}`, `--color-hairline`, `--color-sidebar-active`
  (the hover/active split), `--font-mono`. `--brand-gold`/`--color-brand-gold` removed entirely — grep
  confirms zero remaining references anywhere in `frontend/src`. `.label-micro` and `.shadow-card`
  added as the only two hand-written `@layer components` classes (a repeated uppercase-micro-label
  composite and the mockup's card shadow — everything else stayed utility classes). `--radius` moved
  `0.7rem` → `0.875rem`. `.dark` was retuned from the same navy family (`#0b141c` background) — **no
  dark-mode mockup exists**, so this palette is inferred, not sourced; flagged as the highest-risk
  unverified surface in this pass (see Known gaps).
- `frontend/src/app/layout.tsx` — `Geist` → `Archivo` (no `weight` array — it's a variable font;
  passing one would have forced static instances and lost the mockup's 500/600 weight interpolation)
  + `IBM_Plex_Mono` (`weight: ['400','500','600']` — mandatory here, this family isn't variable).
- `frontend/src/lib/format.ts` — **new**. `formatINR`/`formatINRPlain`/`formatCompactINR`/
  `amountInWords`/`formatAgeDays`/`daysBehind`. Replaces 4 duplicated local `formatINR` functions
  (`app/page.tsx`, `projects/`, `workers/`, `quotations/` each had their own byte-identical copy).
  `amountInWords` (Indian 2-2-3 grouping) verified via a throwaway `node -e` script across boundary
  values (0, 1, 99, 100, 999, 1000, 99999, 100000, 10000000, 2199756) before being wired in anywhere.
  `daysBehind` isn't called from any page yet — Phase 2/3 will use it on the dashboard and Job detail;
  it exists now so Phase 1 ships the full utility surface the plan calls for, not just what this
  pass's own edits happen to need.
- `frontend/src/components/{stat-card,status-badge,page-header,segmented-control,sparkline,mini-bar,
  empty-state,not-tracked-yet}.tsx` — **new shared components**. Only `status-badge.tsx` (via
  materials/leads/platform's `statusBadge`/`statusBadgeClass` helpers) is actually consumed by an
  existing page this pass; the rest (`StatCard`, `PageHeader`, `SegmentedControl`, `Sparkline`,
  `MiniBar`, `EmptyState`, `NotTrackedYet`) are built now per the plan's Phase 1 file list but wired
  into pages starting Phase 2, when those pages get their structural (not just token-level) rewrite.
  `NotTrackedYet` in particular exists ahead of its first use so later phases have it ready the moment
  a real "no data source yet" band needs it (Money band, On-site-this-week, etc.) — this project's
  hard rule against silently mixing real and fake data.
- `frontend/src/components/app-sidebar.tsx` — dark shell (inherited automatically from the new
  `--sidebar`/`--sidebar-foreground` tokens, no structural change needed there), gold wordmark
  removed, and a `data-active:bg-sidebar-active` className override added to both `SidebarMenuButton`
  usages (main nav + the SUPERADMIN-only Permissions link) — see `components/ui/sidebar.tsx` note
  below.
- `frontend/src/components/ui/sidebar.tsx` — **not modified** (vendored shadcn code, per this
  project's existing convention of not hand-editing `components/ui/`). Confirmed by direct read that
  `SidebarMenuButton`'s className applies the identical `--sidebar-accent` token to `hover:`,
  `active:`, and `data-active:` states — the override lives entirely in `app-sidebar.tsx`'s per-usage
  `className` prop (merged in via `cn`/`twMerge`, which resolves the conflicting `bg-*` utility in
  favor of the later, more specific one), not in the primitive itself.
- Every other route (`app/{page,login,leads,customers,projects,quotations,workers,materials,
  permissions,signup,pending,platform/login,platform}/page.tsx`) — mechanical restyle: local
  `formatINR` deleted in favor of `lib/format.ts` (4 files), hand-picked Tailwind status colors
  replaced with the 4 semantic status tokens (Leads, Workers, Materials, Platform admin), `font-mono
  tabular-nums` added at every currency/phone/date/count/ID display. No JSX structure, state, or data-
  fetching logic changed in any of these files.

## Data / API touchpoints

None — this is a pure frontend/CSS pass. No backend files were touched, no endpoints added or changed.

## Dependencies

- Builds directly on the Claude Design mockup export (`mockups.dc.html`, read in full before this pass
  started) — not on any prior `.ai/` feature doc.
- Every existing feature doc (`dashboard-shell.md`, `leads.md`, `projects.md`, etc.) still describes
  correct *behavior* for its page; only their visual description in `ARCHITECTURE.md`'s styling
  section is now stale in the way it was written, which is why that section was rewritten rather than
  left alongside the new one.

## Known gaps & TODOs

- **No dark-mode mockup exists.** The `.dark` palette in `styles.css` was inferred from the same navy
  family as the light theme's sidebar, not sourced from a design reference — this is the single
  highest-risk unverified visual surface in this pass. Needs a real screenshot pass (see Verification)
  before being trusted as "matches intent" rather than just "internally consistent."
- `StatCard`, `PageHeader`, `SegmentedControl`, `Sparkline`, `MiniBar`, `EmptyState` are built but
  **unused** as of this pass — first real usage lands in Phase 2 when `/` and `/leads` get their
  structural rewrite. Until then they're dead code by design, not an oversight.
- `formatCompactINR`, `amountInWords`, `daysBehind` are also unused as of this pass, for the same
  reason — see Key files.
- Nav label stayed "Projects" (not the mockup's "Jobs") — deliberate, not an oversight: the API path,
  `Resource` enum, and every `.ai/` doc already say `PROJECTS`; a UI-only rename would create a
  vocabulary split for no benefit. See the plan file's Phase 1 scope note.

## Open questions

- None outstanding for this phase — the remaining open item (dark mode fidelity) is tracked above as a
  Known gap, not a question blocking further work.
