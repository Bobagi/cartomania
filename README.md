# Cartomania — Digital Collectible Card Game (Backend + Web)

**Cartomania** is a digital collectible card game. The current set is the
**Dracomania** collection (dragons & fantasy), and the project is built to host multiple collections
(Dracomania, Mythomania, and custom player collections). It is **one project**: the NestJS game engine
(this repo root) plus the SvelteKit browser frontend in [`web/`](./web) — landing/login, card gallery,
player dashboard (avatars + account settings), friends and matches.

> The product is branded **Cartomania** (repo `cartomania`) and served at
> **[`cartomania.bobagi.space`](https://cartomania.bobagi.space)** (the old `chronos.bobagi.space`
> 301-redirects to it).

## 🎮 Gameplay — Attribute Duel

The main mode is **Attribute Duel**. Each round both duelists reveal one card and clash on a single
attribute — **magic / might / fire**. The round winner captures **both** cards into their discard
pile; whoever has captured more cards when a hand empties wins the match. A legacy `CLASSIC` mode also
exists, but Attribute Duel is the focus.

The duel is **server-authoritative**: the full state machine and turn timers live on the backend, so a
match keeps progressing and finishes on its own even with no browser open. The client is a pure
renderer — it polls game state and sends only the player's real moves, which the server validates, so a
tampered client can't stall a match or fake the clock.

The UI is fully available in **English, Portuguese and Spanish**.

## 🛠 Tech Stack

- **Backend:** [NestJS](https://nestjs.com/) (TypeScript), REST + Swagger, layered
  modules/services/repositories
- **Frontend:** [SvelteKit](https://kit.svelte.dev/) (`@sveltejs/adapter-node`) in [`web/`](./web)
- **Data:** PostgreSQL + [Prisma](https://www.prisma.io/) ORM
- **Infra:** Docker / docker-compose; the web app runs under PM2 in production

---

## 🌐 Web frontend (`web/`)

The browser app lives in [`web/`](./web). It serves the landing/login, card gallery, player dashboard
(avatars + account settings), friends and matches, and talks to this backend **server-side** via its
`/api/cartomania/*` proxy — so the browser only ever hits the front's own origin (no CORS).

```bash
# dev (two terminals)
npm run start:dev                          # backend on :3000
cd web && pnpm install && pnpm run dev     # front on :5173

# production build
cd web && pnpm install && pnpm run build   # outputs web/build (adapter-node)
node web/build/index.js                     # serves the front
```

In production (VPS) nginx routes `cartomania.bobagi.space` → the front; the front proxies to the
backend over loopback. Set `VITE_API_BASE_URL` only if the backend isn't reachable at the default
base URL.

---

## 🚀 Run with Docker

### 1) `.env` (repo root)

```env
CARTOMANIA_PORT=3000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_DB=cartomania
DATABASE_URL=postgresql://postgres:change-me@db:5432/cartomania

# Seeded accounts — ALWAYS set strong values; without them the seed falls back to
# weak demo passwords. Required for any internet-facing deployment.
ADMIN_PASSWORD=set-a-strong-password
ALICE_PASSWORD=set-a-strong-password
```

> `.env` is git-ignored and never committed. The backend listens on container port **3000**, exposed
> on the host as `CARTOMANIA_PORT`.

### 2) Start services

```bash
docker compose up -d db cartomania
```

`docker compose up` runs migrations and an **idempotent seed** (the Dracomania collection — 32 cards
plus their pt/es translations — and the `admin` / `alice` accounts).

### 3) API base URL

```
http://localhost:3000
```

Swagger docs: `http://localhost:3000/api`.

---

## ▶️ Run locally (without Docker)

1. Create a `.env` using the variables from the Docker section (point `DATABASE_URL` at your Postgres).
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run start:dev` — the API is then at `http://localhost:3000`.

---

## 📦 Features

- Account management: register / login, change username & password, pick an avatar, delete account
- **Attribute Duel** matches vs. a bot or a friend, with a server-authoritative state machine + timers
- Real-time-ish duel board (state polling), scrollable battle log, Hearthstone-style hand
- Card gallery with localized card names/descriptions (EN/PT/ES)
- Friends: search, requests, roster with online presence, and 1:1 chat
- Multiple collections support, seeded with the 32-card Dracomania set
- REST API documented with Swagger at `/api`

---

## 🧪 Quick API checks

**Health**

```bash
curl http://localhost:3000/health
```

**Start an Attribute Duel** (vs. bot — pass a real player id)

```bash
curl -X POST http://localhost:3000/game/start-duel \
  -H "Content-Type: application/json" \
  -d '{"playerAId":"<player-uuid>"}'
```

**Inspect duel state**

```bash
curl http://localhost:3000/game/state/<gameId>
```

---

## 📜 Prisma migrations

```bash
docker compose exec cartomania sh -lc 'npx prisma migrate dev --name <migration-name>'
```

If you hit "We found changes that cannot be executed":

```bash
docker compose exec cartomania sh -lc 'npx prisma migrate dev --name <migration-name> --create-only'
docker compose exec cartomania sh -lc 'npx prisma migrate reset --force --skip-seed'
```

Then regenerate the client:

```bash
docker compose exec cartomania sh -lc 'npx prisma generate'
```

---

## 🗄 Prisma Studio (DB UI)

```bash
docker compose exec cartomania sh -lc 'npx prisma studio --port 5555 --hostname 0.0.0.0 --browser none'
```

Forward the port to your machine over SSH and open `http://localhost:5555`:

```bash
ssh -N -L 5555:127.0.0.1:5555 <user>@<host>
```

---

## 🔄 Reset DB and reseed (optional, destructive)

```bash
docker compose exec cartomania sh -lc 'npx prisma migrate reset --force'
```
