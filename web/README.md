# Cartomania Web Client

This project is the SvelteKit web frontend for the Cartomania game service. It proxies API requests
to the Cartomania backend server-side during development and calls the same base URL in production
builds.

## Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Cartomania backend running (see the repository root)
- Local HTTPS certificates located in `certs/localhost.pem` and `certs/localhost-key.pem` (already
  committed for development)

## 1. Start the Cartomania backend locally

1. Install dependencies at the repository root: `pnpm install`
2. Configure the backend environment variables as required (copy `.env.example` to `.env`).
3. Run the backend (or use `docker compose up`); confirm the API is reachable:
   ```bash
   curl http://localhost:3056/health
   ```

> If you use a different port, remember it for the `VITE_API_BASE_URL` variable.

## 2. Point the web client at the backend

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a `.env.local` file in the project root and set the backend base URL:
   ```bash
   VITE_API_BASE_URL=http://localhost:3056
   ```
   When you run the dev server, Vite reads this variable and uses it in two places:
   - it proxies `/auth` and `/game` requests to the Cartomania backend;
   - it becomes the base URL for API calls once you build the project for production.
3. Trust the TLS certificate found in `certs/localhost.pem` (or replace it with one trusted by your
   OS/browser) so the browser accepts the HTTPS connection.

## 3. Run the web client in development mode

```bash
pnpm run dev -- --host 0.0.0.0 --port 3055
```

- All API calls go through the Vite proxy to the configured `VITE_API_BASE_URL`.

## 4. Build for production

```bash
pnpm run build
pnpm run preview
```

Before deploying the production build, make sure the environment that serves the compiled output
provides the same `VITE_API_BASE_URL` so the client knows where to reach the Cartomania backend.
