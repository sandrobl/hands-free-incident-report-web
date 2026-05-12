# hands-free-incident-report-web

Admin web UI for incident reports. Built with Vite + React and integrates with Auth0 for authentication and a backend API for report data and images.

## What this app does
- Authenticates users via Auth0 and shows a gated admin dashboard.
- Fetches report lists from the API and shows basic stats.
- Displays report details in a modal, including frames and location maps.
- Uses Leaflet/OpenStreetMap tiles for map visualizations.

## Tech stack
- React 19 + TypeScript
- Vite 5
- Auth0 SPA SDK
- Leaflet / React-Leaflet
- Nginx (production container)

## Project structure
- src/ - main React app
- src/context/AuthContext.tsx - Auth0 client setup and auth state
- src/hooks/useApi.ts - API helpers with Auth token injection
- src/components/ - UI components (dashboard, modal, etc.)
- src/config.ts - Auth0 + API base configuration
- single_js/ - static, no-build version (HTML + JS)

## Configuration
Auth0 and API endpoints are defined in [src/config.ts](src/config.ts):
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_AUDIENCE`
- `API_BASE`

These values are currently hard-coded in the client.

## Scripts
From [package.json](package.json):
- `npm run dev` - start Vite dev server
- `npm run build` - typecheck + production build
- `npm run preview` - preview production build

## Docker (production build)
The root [Dockerfile](Dockerfile) builds the app and serves it with Nginx.

Build and run with docker-compose:
```bash
docker-compose up --build
```

This exposes the app on port 80 using the config in [docker-compose.yml](docker-compose.yml) and [nginx.conf](nginx.conf).

## single_js
The [single_js/](single_js) folder contains a static HTML + JS version that can be served directly with Nginx. Its docker-compose mounts the files into an `nginx:alpine` container:
```bash
cd single_js
docker-compose up
```