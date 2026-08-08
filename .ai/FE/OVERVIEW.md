# Frontend — Overview

## Purpose

Dashboard UI for the Construction CRM. At present it is a single static/mock screen — no live data, no
routing beyond the home page, no backend integration.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.1.0 |
| UI library | React / ReactDOM | ^19.0.0 |
| Language | TypeScript | ^5.7.2 |
| Styling | Plain CSS (no framework/preprocessor) | — |
| Runtime | Node.js | 22 (per `Dockerfile`: `node:22-alpine`) |

No state management library, no HTTP client library, no component/UI kit, no test runner is present in
`frontend/package.json`.

## Directory guide

```
frontend/
├── src/app/
│   ├── layout.tsx        root layout: <html><body>, imports styles.css
│   ├── page.tsx           the single route ("/"): fully static dashboard mock (metrics, pipeline, activity, projects table)
│   └── styles.css         all styling for the app, plain CSS, no modules/scoping
├── next.config.ts          output: 'standalone' (for the Docker build)
├── tsconfig.json            strict TS, bundler module resolution, Next plugin
├── package.json               scripts + dependencies
├── Dockerfile                  multi-stage build using Next's standalone output
└── .env.example                 NEXT_PUBLIC_API_URL (declared, not yet read by any code)
```

There is exactly one route (`/`, from `src/app/page.tsx`) — no other pages, layouts, or API routes exist
under `src/app`.

## Setup / run / build / test

```bash
cd frontend
cp .env.example .env.local
npm install

npm run dev       # next dev — http://localhost:3000
npm run build      # next build
npm run start        # next start (serves the build output)
```

No `test` script is defined in `frontend/package.json` and no test files exist in the project.
