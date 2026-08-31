# Ataniq Ground Control Station

Frontend-only marine drone fleet monitoring dashboard. No backend required — telemetry, alerts, and video feeds are all simulated client-side, so the app runs entirely as a static site (deployable to GitHub Pages).

See [plan.md](./plan.md) for full product/architecture background.

## Stack

- Svelte 5 + TypeScript + Vite
- Tailwind CSS
- MapLibre GL JS (vector map + fleet markers/trails)
- Mock data layer behind swappable interfaces (`src/lib/api`) — see plan.md for the mock/real backend swap pattern

## Getting started

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Type checking

```sh
npm run check
```

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app with `VITE_BASE_PATH=/<repo-name>/` and publishes `dist/` via GitHub Pages. Enable Pages in the repo settings with source "GitHub Actions".

## Switching from mock to a real backend

Set `VITE_USE_MOCK=false` and provide `VITE_WS_TELEMETRY_URL` / `VITE_WS_ALERTS_URL` env vars. No UI/store code changes are required — see `src/lib/api/factory.ts`.
