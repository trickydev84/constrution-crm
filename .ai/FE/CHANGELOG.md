# Frontend — Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project has no git history
available at documentation time (working directory is not a git repository), so no dated releases can be
reconstructed. The entry below reflects the current state of `frontend/` as a single baseline snapshot.

## [Unreleased]

_No changes recorded yet since this baseline was written._

## [0.0.0] - baseline (documented 2026-08-08)

### Added

- Next.js 15 App Router project scaffold (`frontend/next.config.ts`, `frontend/tsconfig.json`).
- Root layout (`frontend/src/app/layout.tsx`) and single dashboard route
  (`frontend/src/app/page.tsx`) with static/mock CRM dashboard content (metrics, lead pipeline chart,
  recent activity, active projects table).
- Global stylesheet (`frontend/src/app/styles.css`).
- Docker support (`frontend/Dockerfile`, standalone Next.js output) and inclusion in root
  `docker-compose.yml` as the `web` service.
