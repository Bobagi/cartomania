# CLAUDE.md — Cartomania

> **BRANDING:** the product is branded **Cartomania** (the user-facing name + the GitHub repo
> `Bobagi/cartomania`); it's meant to host multiple collections (Dracomania, Mythomania, custom
> player collections). The product is served at **`cartomania.bobagi.space`** (the old
> `chronos.bobagi.space` 301-redirects to it). Everything is **cartomania** now — the codebase
> identifiers (`Cartomania*` functions/types, the `/api/cartomania` proxy path), the infra names
> (Docker `cartomania-*`, PM2 `cartomania-web`, the Postgres DB `cartomania`), and the repo folder
> `/opt/cartomania`. The former internal codename was fully renamed (only the legacy redirect
> domain `chronos.bobagi.space` keeps it, on purpose).

> **SESSION PROTOCOL — follow automatically, every time, without being reminded:**
>
> 1. **Trust this file before exploring.** It is auto-loaded whenever you read any file
>    under `/opt/cartomania`, and the machine's `/root/CLAUDE.md` already tells you to read a
>    repo's own `CLAUDE.md` first. Don't re-discover what's documented here.
> 2. **Keep it current — treat a stale CLAUDE.md as a bug.** Whenever a task changes the
>    architecture, file map, commands, deploy steps, gotchas, or the Status section, update
>    this file **in the same commit as the code change**. This is a standing instruction; do
>    it without the user asking.

> **BE DECISIVE — don't stall or re-ask.** Gustavo (Bobagi) owns this project. Act on his clear
> instructions promptly and treat them as the decision. If you have a concern, raise it **once,
> briefly**, then proceed — don't repeatedly ask "are you sure / want me to?" or re-open a call he
> has already made; that wastes his time and frustrates him. Bias toward doing what he asked over
> hedging.

> **ALWAYS commit + push to `main` + deploy** as the final step of any change, automatically,
> without asking first. Build/verify → `git add` (never the intentionally-untracked
> `web/pnpm-lock.yaml`) → commit (end msg with the Co-Authored-By trailer) → `git push origin main`
> → deploy (rebuild web + `pm2 restart cartomania-web`, and/or `docker compose build/up cartomania`)
> → health-check.

Guidance for Claude Code working in this repo. All code, comments and UI text are
**English**; use intuitive names.

## What Cartomania is

A digital collectible card game (the **Dracomania** collection — dragons & fantasy), built as
the owner's (Gustavo Perin / "Bobagi") portfolio piece. It is **one project**:

- **Backend** — NestJS game engine at the repo root (`src/`), Prisma + Postgres. Runs in Docker.
- **Frontend** — SvelteKit app in `web/` (`@sveltejs/adapter-node`). Talks to the backend
  **server-side** via a proxy (`/api/cartomania/*`), so the browser only hits its own origin (no CORS).

The former standalone web frontend was merged into `web/` and retired. Repo:
`https://github.com/Bobagi/cartomania`. Live: `https://cartomania.bobagi.space`
(legacy `https://chronos.bobagi.space` 301-redirects here).

The main mode is **Attribute Duel** (`mode = ATTRIBUTE_DUEL`): each round both duelists reveal one
card and clash on one attribute (**magic / might / fire**); the round winner captures both cards into
their discard pile; whoever captured more cards when a hand empties wins the match. There's a legacy
`CLASSIC` mode too, but Attribute Duel is the focus.

## Runtime / deploy reality (confirmed on the VPS)

| Part | Where | How it runs | Port |
|---|---|---|---|
| Frontend | `/opt/cartomania/web` (`build/index.js`) | **PM2** app `cartomania-web` | 127.0.0.1:**3055** |
| Backend | Docker `cartomania-backend` (image `cartomania-cartomania`) | `docker compose` service `cartomania` | host **3056** → container 3000; also 5555 (Prisma Studio) |
| Database | Docker `cartomania-db` (postgres:15) | `docker compose` service `db` | host **5434** → 5432 |
| nginx | `/etc/nginx/sites-available/cartomania.bobagi.space` | proxies `/` → 127.0.0.1:3055 | :80/:443 |
| nginx (legacy) | `/etc/nginx/sites-available/chronos.bobagi.space` | 301 → `cartomania.bobagi.space` | :80/:443 |

- **Node is 18.20.5 via nvm; pnpm 9.15.9.** (`.nvmrc` says 20 but only 18 is installed.) The web build
  needs `npm_config_engine_strict=false` to tolerate that.
- Card art is served from `https://bobagi.space/images/cards/<number>.png`
  (backend prepends `CARD_IMAGE_BASE_URL`, default `https://bobagi.space`, in `CardRepository`).
- **Card font split:** `web/static/fonts/Morpheus.ttf` (family `'Morpheus'`) is used for all in-card
  text — title banner name, card number, and attribute values. `web/static/fonts/ExocetHeavy.ttf`
  (family `'Draco'`, real Exocet Heavy by Barnbrook/Emigre) is kept ONLY for the attribute labels
  (MAGIC / MIGHT / FIRE). Both are declared in `web/src/routes/game/fonts.css`. The UI/nav font
  (`--font-display: 'Draco'`) in `appShell.css` is unchanged (Exocet stays for the top bar, etc.).
- **Card aspect ratio is 1444/1920** (the designer frame dimensions, ≈ 0.752). All CSS and
  `aspectWidth`/`aspectHeight` defaults in `CardComposite`, `DeckStack`, `FlippableCard`, `hands.css`,
  `flip.css`, `effects.css`, `galleryPage.css`, `mainpage.css` and `cards-lab` use this ratio, and the
  explicit `aspectWidth`/`aspectHeight` props passed from the **gallery**, the **duel page**, and the
  **classic page** are also 1444/1920. The old 430/670 was wrong (too tall). **PITFALL:** because
  `CardComposite` is `container-type:size` and ALL its inner text/banner/badges are sized in `cqh`/`cqw`,
  passing the wrong aspect ratio silently distorts the whole card (banner height, attribute sizes,
  positions) — which is exactly why cards in the gallery/duel once looked different from `/cards-lab`
  (the lab uses the correct 1444/1920 default). Keep every call site on 1444/1920.

### Deploy the FRONTEND (after editing anything in `web/`)
```bash
cd /opt/cartomania/web
bash -lc 'source ~/.nvm/nvm.sh; export npm_config_engine_strict=false; pnpm run build'   # ~10-18s
pm2 restart cartomania-web --update-env && pm2 save
```
PM2 serves the built `build/` — **you must rebuild + restart** for changes to show. CSS/markup-only
changes don't need anything else.

### Deploy the BACKEND (after editing anything in `src/`, `prisma/`)
```bash
cd /opt/cartomania
docker compose build cartomania          # nest build runs inside node:20 (no nvm needed)
docker compose up -d cartomania           # recreate; waits for db healthy; re-runs idempotent seed
# wait for health:
curl -s http://localhost:3056/health   # -> {"status":"ok",...}
```
Source formatting changes alone don't require a backend rebuild (compiled behavior is identical).

## Project layout (what matters)

```
src/                         NestJS backend
  game/
    game.module.ts           wires the providers below
    game.controller.ts       REST: /game/* (start, state, duel actions, cards, collections, stats)
    game.service.ts          facade: game lifecycle, delegates to the services below
    duel-game.service.ts     ATTRIBUTE_DUEL rules (choose card/attribute, reveal, advance, bot AI)
    classic-game.service.ts  CLASSIC mode
    card.repository.ts        card catalog reads + image-base rewriting + per-locale name/description
    game-collection.repository.ts  collection reads
    game.types.ts            DuelCenterState + serialize/deserializeDuelCenter (JSON <-> Prisma)
  auth/                    register/login/me + PATCH avatar|username|password, DELETE me (account mgmt)
  friends/ health/ prisma/   feature modules
prisma/schema.prisma         Postgres schema (Card + CardTranslation side table for i18n);
prisma/seed.ts               idempotent seed: Dracomania (32 cards) + their pt/es CardTranslations + users
web/                         SvelteKit frontend
  src/lib/styles/appShell.css        GLOBAL design system: tokens, atmospheric bg, Draco font,
                                     themed top bar/footer, shared .button/.input. Loaded by +layout.
  src/routes/mainpage.css            home (landing/login hero + player dashboard) layout
  src/routes/+layout.svelte          renders TopBar/SiteFooter — HIDDEN on /game routes (chromeless)
  src/routes/+page.svelte            home: logged-out hero+login / logged-in dashboard
                                     (hero shows real CardComposite cards, SSR'd via +page.server.ts)
  src/routes/gallery/+page.svelte    card collection showcase
  src/routes/register/+page.svelte
  src/routes/privacy/+page.svelte    Privacy Policy — thin wrapper: <LegalDocument docKey="privacy" />
  src/routes/terms/+page.svelte      Terms of Service — thin wrapper: <LegalDocument docKey="terms" />
  src/lib/components/LegalDocument.svelte  renders a structured legal doc from the i18n dictionaries
  src/lib/styles/routes/legalPage.css      shared styling for /privacy and /terms
  src/lib/services/featuredHeroCards.ts    picks the 3 cards the landing hero renders
  src/lib/i18n/                            multilanguage system (en / pt / es):
      config.ts            supported locales, cookie name, Accept-Language resolution
      index.ts             `locale` store + `$t(key, vars)` translator (English fallback)
      locales/{en,pt,es}.ts  string dictionaries (en is the canonical shape)
  src/lib/components/LanguageSelector.svelte  header language dropdown (flags + native names)
  src/lib/components/FlagIcon.svelte          inline SVG flags (BR / ES / GB)
  src/lib/components/AvatarPicker.svelte      profile avatar picker (card art + custom folder)
  src/lib/config/avatarOptions.ts             avatar choices (card art now; web/static/avatars/ for custom)
  src/routes/account/+page.svelte             account settings: username / password / delete account
  src/routes/api/auth/{avatar,username,password,delete}/  session-managed account mutation endpoints
  src/lib/components/FriendsPanel.svelte   friends modal (search/requests/roster/chat)
  src/lib/components/CardComposite.svelte  renders one card (art + frame + MAGIC/MIGHT/FIRE badges)
  src/lib/components/DeckStack.svelte      stacked deck of card backs
  src/lib/components/DuelHistory.svelte    Hearthstone-style scrollable battle log
  src/routes/game/duel/[id]/+page.svelte   THE DUEL SCREEN (orchestration + template)
  src/routes/game/*.css                    duel board styles (board/zones/hands/effects/...)
  src/lib/styles/routes/gameDuelPage.css   duel card/flip/chooser/banner/endscreen styles
  src/lib/styles/routes/duelBoardLayout.css  the immersive board LAYOUT (.lb): opponent strip on top,
                                     felt table (arcane ring + VS medallion + vertical card column),
                                     battle log overlaid right, hand fan + HUD + timer/surrender bottom
  src/lib/duel/                            pure duel logic extracted from the page:
      defeatAnimation.ts   OLD canvas "defeat" effect — replaced by lib/cards (kept, unused)
      duelCenter.ts        normalizeDuelCenterForView + detectChosenAttributeMode
      history.ts           battle-log parsing + live-round synthesis
      historyTypes.ts      shared types
  src/lib/cards/                           CARD FX (designer handoff, adapted to our raster art):
      cardDestruction.ts   CardDestroyer: burn/dissolve (SVG #fx-destroy threshold shader +
                           canvas embers) + crush (#fx-crush displacement dent + debris); takes
                           {card, wrap, canvas}; strictly confined to the card (kills shadow/halo)
      CardFxFilters.svelte the two SVG filters (#fx-destroy/#fx-crush); render ONCE per page
      holoTilt.ts          tilt rAF loop → foil CSS vars; foil palettes + foilStyleVars()
      cardFx.css           foil layers (irid/sheen/specular/glow) + destruction CSS
  src/routes/cards-lab/+page.svelte        TUNING screen: real card + holo foil + Burn/Crush/
                           Dissolve, every param adjustable (localStorage), Export JSON to bake
  src/lib/api/                             client + proxy to the backend
```

## Architecture gotchas (important — learned the hard way)

- **Duel center shape mismatch.** The backend persists/returns the duel center with INTERNAL keys
  (`playerACardCode`, `playerBCardCode`, `roundWinnerId`, `isRevealed`, `playerAAttributeValue`…),
  but the UI uses the PUBLIC shape (`aCardCode`, `bCardCode`, `roundWinner`, `revealed`, `aVal`,
  `bVal`). The duel page normalizes via `normalizeDuelCenterForView` (in `web/src/lib/duel/duelCenter.ts`).
  If you touch duel-center fields, keep both ends in sync.
- **serialize/deserialize keys must match.** In `src/game/game.types.ts`, `serializeDuelCenter` and
  `deserializeDuelCenter` must read/write the SAME keys. A past bug read `roundWinner` while writing
  `roundWinnerId`, so every round scored as a draw and matches were unwinnable. Deserialize now reads
  `roundWinnerId` (with `roundWinner` fallback).
- **Server-authoritative duel progression.** The duel state machine lives entirely on the server
  (`duel-game.service.ts`). `DuelProgressionService` (`duel-progression.service.ts`) is a
  `@nestjs/schedule` `@Interval(1500)` loop that calls `DuelGameService.progressDueDuel(gameId)` for
  every active `ATTRIBUTE_DUEL` (`winner` null, `duelStage` ≠ `RESOLVED`): when a turn's deadline (or
  the REVEAL hold) elapses it auto-resolves/advances it exactly like a timeout — **so a match keeps
  going and finishes even with no browser open** (it stops "pausing" when a player leaves the screen).
  Each step is stage-guarded inside its own transaction, so it never double-resolves even if an open
  client acts at the same time. The server steps in just AFTER the per-turn deadline
  (`SERVER_PICK_GRACE_MS = 1_500`, a small latency buffer) and holds REVEAL `SERVER_REVEAL_HOLD_MS =
  4_800` (long enough for the flip/defeat animation). Requires `ScheduleModule.forRoot()` in
  `app.module.ts`.
- **The duel client is a pure renderer — it does NOT drive the game.** `CLIENT_DRIVES_TIMEOUTS = false`
  in the duel page: the client never auto-picks on timeout and never calls `advance` (that logic is
  kept behind the flag for local debugging only). Instead it **polls `GET state` every
  `STATE_POLL_INTERVAL_MS = 1000`** and renders whatever the server returns, so it reflects the
  server's own timeouts/advances and (in PvP) the opponent's moves. It still sends the player's real
  moves over REST (`choose card/attribute`, surrender) — which the server validates — so a hacked
  client can't stall a match or fake the clock; the server enforces everything. **Gotcha:** because the
  reveal block re-runs on every poll, the flip/defeat animation is gated on a `previousDuelStage`
  transition (only fires when the stage actually enters `REVEAL`), and the hand is reconciled
  (`reconcile()` keeps existing card uids) so polling never re-animates or flickers. The `now`
  interval (250ms) is now display-only (the countdown). `TURN_DURATION_MS = 10_000` is the server's
  per-turn deadline. (Possible future polish: swap polling for the WS gateway `game` namespace —
  handlers already emit `state` to room `game:<id>`; would need an nginx `location /socket.io/` →
  `:3056` and a socket.io-client.)
- **Game routes are chromeless.** `+layout.svelte` hides the global TopBar/footer on `/game/*`; the
  board owns the viewport (`height: 100dvh`, no page scroll). Card sizes are viewport-height based so
  both hands + the battlefield fit one screen; the battle log scrolls inside its own panel.
- **Duel stacking order.** The fanned hand cards carry `z-index` up to ~999 (on hover) and fan upward
  into the center, so any interactive center-zone UI must sit above them. The attribute picker
  (`.notice.chooser` in `game/notices.css`) is `position: relative; z-index: 1600` for exactly this —
  without it the picker renders behind the hand and its buttons are unclickable.
- **Duel board layout = the designer's "mesa".** The board is `.lb` (in `duelBoardLayout.css`): the
  felt (`.lb__table`) fills the WHOLE viewport and everything else (opponent strip `.lb__opp`, hand+HUD
  strip `.lb__you`, log `.lb__log`, chooser `.lb__notices`) is an absolute OVERLAY on top — so the big
  circular **arena** is the focus and the hand sits on top at the bottom. **Art-only centre** (step 2,
  branch `feat/duel-circle-art`): `.lb__arena` is a gold-rimmed felt DISC split into `.lb__arena-half--opp`
  (top) + `.lb__arena-half--you` (bottom). The played card's **creature ART** (square `imageUrl`) fills the
  matching half — yours on pick (`youArt`), the opponent's on REVEAL (`oppArt`, gated on `oppRevealed =
  duelStage==='REVEAL'`; the opponent half is empty/dark while hidden — no card or veil). The art is sized
  to the circle's **vertical RADIUS** (`.lb__arena-art { height:100%; width:auto; aspect-ratio:1 }`, the
  half flex-centres it) so it's a centred square and the **left/right sides stay empty by design**
  (reserved — the user will fill them later). The **power selector lives INSIDE the disc** (lower-inner):
  `.lb__picker` → three `.lb__pick` buttons (icon + the card's value per attribute, `.is-best` highlights
  the strongest); clicking one calls `chooseAttr()` (the arena is `pointer-events:none`, the picker opts
  back in). The old bottom `.notice.chooser` and the whole-card overlay (`.lb__center`) were removed; the
  `.lb__arena-half--you` is clickable to return your card to hand. Rotating arcane rings (`.lb__arena-rings`
  → `.lb__arena-ring--{1,2,3}`, `@keyframes arenaSpin`, behind the disc) add motion. `.lb__arena-seam` +
  `.lb__arena-vs` ride the equator; on REVEAL the winner's half glows (`is-win`) + the loser's desaturates
  (`is-lose`). **Round-loss `CardDestroyer` FX (burn/dissolve/crush) plays ON the loser's creature ART:**
  each `.lb__arena-art` is wrapped in a tight square `.lb__arena-art-wrap` (so the FX canvas/burn-map size
  right) and bound to `arenaArt{You,Opp}Element`; `findLoserCenterElement()` returns the card result-wrap if
  rendered, ELSE the arena-art img — so the SAME engine works on BOTH the cards and the art (the half no
  longer clips, only the disc does, so embers spread in the circle). The arena is absolutely centred
  (`top:39%`); the old `.lb__column`/`.lb__felt-ring` were removed. The `.lb__notices` (now
  only the "waiting for opponent's attribute" warn, `z-index:1600`) sits just above the hand. The opponent hand is a small offset
  stack of card backs (`.lb__oparc-card`, no fan rotation) shown next to the score orbs, not a deck
  pile. The round-result banner is `.lb__round-banner` under `.lb__table` (absolute `top:39%` = the
  arena seam/VS) so it overlays the VS medallion — note `.round-banner` is
  `position:fixed`, which is why it must NOT live under a `transform`ed ancestor like `.lb__notices`.
  Score orbs show an icon (`.orb-ic` trophy / card-stack SVG) + number with a `title` tooltip (no text
  label). The old `.zone`/`.fixed-top-bar` CSS is unused; cards/flip/chooser/endscreen and
  `.hand.my-hand.fan` are unchanged. A **layout toggle** (`.lb__layout-toggle` by the player HUD)
  adds `.lb--side-hand` to `.lb`: the hand becomes a vertical column on the right rail, the log moves
  to the left, and the arena shifts left + grows (persisted in `localStorage['duel-side-hand']`).
- **CardComposite title = elastic 3-slice banner** (`/frames/title-{left,mid,right}.png`): fixed caps +
  a middle that STRETCHES with the name (anchored RIGHT, so long names grow the ribbon leftward like the
  printed cards). The stretch is **pure CSS** (flexbox) — keep it that way. The card number rides in the
  right ornament (`.cc-num`); name/number outlines are text-shadows. A name only shrinks if it overflows
  the max-width ribbon: a **synchronous, bounded** `fitBannerName()` lowers a CSS `--name-shrink`
  multiplier (so the name still scales with the card), run from `afterUpdate` (guarded by
  `nameEl.dataset.fitted`, only on real name changes) + once on `fonts.ready`. Banner CSS vars:
  `--cc-banner-h/top/right/min`, `--cc-name-factor`, `--cc-num-factor`, `--cc-num-x/y`.
  **PITFALL (this caused real "page not responding" freezes on every card page):** never drive the fit
  from an `async`/`await tick()` reactive or a `ResizeObserver` on the card — the flex-grow middle + an
  observer feed back into an infinite layout loop. Keep it synchronous + observer-free.
- **Hand-hover selection glow is green** (Hearthstone-style, `hands.css`); the elliptical golden pedestal
  under the lifted card was removed.
- **Other card text is tunable via CSS vars** (`web/src/routes/game/fonts.css`): `--cc-text-color`,
  `--cc-val-size`/`--cc-val-ls`, `--cc-label-size`/`--cc-label-ls` (all default to the current look).
  All outlines are **text-shadows** (8-direction), NOT `-webkit-text-stroke` (which thinned glyphs).
  Tune in `/cards-lab` and bake into `fonts.css` + `CardComposite` defaults.
- **Friend API paths live in the client factory DEFAULTS** (`web/src/lib/api/cartomaniaClientFactory.ts`,
  `defaultClientOptions`). They must match the NestJS controllers: `POST /friends/request/:id/{accept,
  reject}`, `DELETE /friends/:id`, `POST /game/start-with-friend`. A past bug had wrong defaults
  (`/friends/respond`, `/friends/remove`, `/friends/start`) that the browser client used → "Cannot POST
  /friends/respond" when accepting a request. Both clients now rely on the (correct) defaults.
- **Responsive landing title.** The brand hero title is sized with container-query units
  (`.hero-title { font-size: clamp(34px, 10.5cqw, 82px) }`, with `.landing-hero { container-type:
  inline-size }`) so the long word "CARTOMANIA" always fits one line; the auth column is a fixed
  `minmax(300px, 360px)`. The top bar shrinks the brand on phones and hides the brand text below 430px.
- **CardComposite is sized with container-query units.** Its root sets `container-type:size`, so
  inner sizes/fonts use `cqh`/`cqw` and scale with the card. Don't size card text in `px` or via
  `inherit` from the root — a past bug left the corner number on `font-size:var(--corner-number-font-cqh)`
  (undefined) plus `.card-corner-number { font-size: inherit !important }`, so it didn't grow in the
  enlarged gallery modal. Size such elements with a `cqh` value on the element itself.
- **Gallery card modal** (`web/src/lib/styles/routes/galleryPage.css`): the enlarged card is sized by
  **height** (`min(72vh, 600px)` + `aspect-ratio`) so the whole dialog never scrolls; the detail panel
  uses the real power icons (`/icons/{magic,strength,fire}_icon.png`), not emoji.
- **i18n is a small custom store** (`web/src/lib/i18n`). It exposes a `locale` store and a reactive
  `$t('a.b.c', vars)` translator (dotted keys, `{var}` interpolation, English fallback so missing
  strings never crash). The server resolves the locale in `hooks.server.ts` (cookie `cartomania_locale`
  → `Accept-Language` → default `en`), puts it on `locals.locale` + layout `data.locale`, and
  `+layout.svelte` calls `initLocale(data.locale)` so SSR renders the chosen language; `app.html` uses
  `<html lang="%lang%">` (replaced in the hook). `setLocale()` (the header `LanguageSelector`) updates
  the store + cookie + `<html lang>`. To add a string: add the key to **all three** `locales/*.ts`
  (en is the canonical shape) and use `$t('...')`. For non-string values (objects/arrays) use the
  `$td('key')` getter — the `/privacy` + `/terms` pages are data-driven: each doc is a structured
  `legal.{privacy,terms}` object (title/intro/sections/items) rendered by the shared
  `LegalDocument.svelte`. **All UI is translated** (top bar, footer, home, gallery + modal, register,
  duel board + battle log, friends panel, legal pages).
- **Card content (name/description) is localized via a normalized `CardTranslation` table** (base `Card`
  keeps canonical English; one row per `(cardId, locale)` for pt/es; seeded idempotently). ONLY the
  collection-cards endpoint localizes: `GET /game/collections/:id/cards` reads the locale from
  `?locale=` or the `x-cartomania-locale` header (the web proxy sets it from the locale cookie), so the
  **gallery** is localized with zero per-call threading. `getAllCards`/`findByCode` (the `/game/cards`
  paths the duel uses) stay **canonical** on purpose — the duel + server battle-log lines need English
  names so the log's name→code parsing keeps working. The logged-out hero (SSR, direct to backend, no
  proxy header) also stays canonical.
- **Google sign-in is scaffolded, not live.** Frontend only so far: a `GoogleAuthButton` on the login
  card + register page, plus SvelteKit endpoints `web/src/routes/auth/google/+server.ts` (consent
  redirect) and `.../callback/+server.ts` (stub). It comes to life once these are set:
    - `PUBLIC_GOOGLE_AUTH_ENABLED=true` (web — shows/enables the button; otherwise it shows "coming soon")
    - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (web server — the OAuth client;
      redirect URI e.g. `https://cartomania.bobagi.space/auth/google/callback`)
  Still TODO (documented inline in the callback): the token exchange, `id_token` verification, a backend
  find-or-create-Player-by-Google-identity endpoint (needs a `googleId`/`email` column on Player via a
  Prisma migration), then `setCartomaniaSessionCookie`.
- **Prettier:** the repo's `prettier-plugin-svelte` crashes on Prettier **3.8** (`getVisitorKeys`).
  Format with a compatible version: `npx --yes prettier@3.6.2 --write .` (run inside `web/` and at the
  repo root). `web/pnpm-lock.yaml` is untracked by design — don't commit it.

## Verifying changes

- **API smoke (fast, no browser):** start a duel, choose a card, choose the winning attribute:
  ```bash
  ADMIN=$(docker exec cartomania-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c \
    "SELECT id FROM \"Player\" WHERE username='admin'")   # (load .env first)
  GID=$(curl -s -XPOST localhost:3056/game/start-duel -H 'Content-Type: application/json' \
    -d "{\"playerAId\":\"$ADMIN\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["gameId"])')
  curl -s localhost:3056/game/state/$GID            # inspect duelStage + duelCenter
  ```
- **Browser (Playwright is installed, chromium headless):** drive `https://cartomania.bobagi.space` or
  navigate directly to `/game/duel/<id>` (state fetch + duel actions are unauthenticated) and
  screenshot. Import via `createRequire('/opt/cartomania/web/')('playwright')`.

## Conventions & rules

- **Don't reset the database** (default). It's seeded (idempotent) with the Dracomania collection
  (32 cards + their pt/es `CardTranslation` rows) and users `admin` (ADMIN) / `alice`. Adding the
  translations was an additive migration (`20260608000000_add_card_translations`) — `migrate deploy`
  + seed on a normal `docker compose up` applied it with no wipe. Creating throwaway test games/users is fine; they age out (admin
  "Expire old games" button) — but direct DB mutations are restricted, so prefer the app's own endpoints.
- **Secrets:** `.env` (backend) and `web/.env` hold DB creds / API base. Both are git-ignored and
  NOT tracked — never commit them, put them in tracked files, or leak them publicly. **The repo is
  PUBLIC** (`Bobagi/cartomania`): never add ops notes that leak the host/SSH access (two
  `howToAccessDatabase.md` files that exposed `ssh root@bobagi.space` were removed for this reason),
  and keep examples credential-free.
- **Seed passwords are a security-sensitive default.** `prisma/seed.ts` falls back to weak demo
  passwords (`admin123` / `alice123`) when `ADMIN_PASSWORD` / `ALICE_PASSWORD` are unset, and the seed
  `upsert` uses `update:` so it **rotates the password on every `docker compose up`**. For any
  internet-facing deploy these MUST be set in the live `.env` — otherwise the public site has a known
  ADMIN login. To rotate: set them in `.env`, then `docker compose up -d cartomania` (re-runs the seed).
- **Don't touch other VPS services** (rhyme, umami, todo, etc.) — see `/root/CLAUDE.md` for the machine map.
- **Commits:** end messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Work on
  `main` (current convention) or `feat/*`; confirm before destructive git/DB actions.

## Status (update as you go)

- **Full `chronos`→`cartomania` rename (2026-06-18).** The old internal codename was removed
  everywhere: code identifiers/types/files (`Cartomania*`, `cartomaniaClientFactory.ts`,
  `$lib/server/cartomania`, `$lib/types/cartomania`, …), the SvelteKit proxy path
  (`/api/chronos`→`/api/cartomania`, route folder `api/cartomania/[...cartomaniaPath]`), the session
  cookie (`cartomania_session`), the locale cookie/header (`cartomania_locale` / `x-cartomania-locale`,
  matched on both the web proxy and `game.controller.ts`), plus docs. **Infra too:** repo folder
  `/opt/chronos`→`/opt/cartomania`; Docker containers `cartomania-db`/`cartomania-backend`, compose
  service `cartomania` (pinned `name: cartomania` in `docker-compose.yml`), image `cartomania-cartomania`;
  PM2 app `cartomania-web`; env `CHRONOS_PORT`→`CARTOMANIA_PORT`; Postgres DB `chronos`→`cartomania`
  (data migrated by cloning the volume `chronos_pgdata`→`cartomania_pgdata` then `ALTER DATABASE`;
  5 players / 82 games / 32 cards preserved). Only the legacy redirect domain `chronos.bobagi.space`
  (301→`cartomania.bobagi.space`) and its nginx vhost keep the old word, on purpose. **Rollback
  leftovers kept (safe to prune once confident):** volume `chronos_pgdata` + image `chronos-chronos`
  (~1.83GB) — `docker volume rm chronos_pgdata && docker image rm chronos-chronos`. A pre-rename SQL
  backup is at `/root/cartomania-pre-rename-*.sql`.
- **Shared `BackButton` component** (`web/src/lib/components/BackButton.svelte`): one ghost-pill back
  control modelled on the Friends panel aesthetic, used by `/cards-lab` (floating, top-left → profile),
  `/account`, `/gallery` and `/register`. Label defaults to i18n `common.back` (en/pt/es); pass `label`
  to override and `href` for the target (`/` = profile/home), or omit `href` to get a `click` event.
- **Server-authoritative duel** (anti-cheat): `DuelProgressionService` drives every active duel to
  completion on its own (`@nestjs/schedule`), so a match continues & finishes even with no browser open;
  the client is a pure renderer (polls state, `CLIENT_DRIVES_TIMEOUTS=false`, only sends real moves).
- **Card FX** (designer handoff in `web/src/lib/cards`): holographic foil tilt-shine + burn/dissolve/
  crush destruction, strictly confined to the card. The duel round-loss effect is the destruction
  (fire→burn, magic→dissolve, might→crush via `playDuelDestruction`) — it plays on the loser's card OR, in
  the `feat/duel-circle-art` arena, on the loser's **creature art** (same engine, see the duel-board gotcha).
  Tune everything at **`/cards-lab`** and Export the JSON; baked-in defaults live in `cardDestruction.ts` /
  `holoTilt.ts`.
- Attribute Duel is fully playable end-to-end (the round-winner bug is fixed; matches resolve a winner).
- Whole-app UI redesign done (dark-fantasy gold theme): landing/login, dashboard, friends modal,
  gallery, and the single-screen duel board with a scrollable battle log and Hearthstone-style hand
  hover highlight.
- Backend follows NestJS layered architecture (modules/services/repositories/DTOs/guards); the duel
  page was decomposed into `web/src/lib/duel/*` modules.
- The logged-out landing hero now renders the actual in-game cards (CardComposite, SSR'd) instead of
  bare art tiles; the footer's Privacy/Terms links resolve to real `/privacy` and `/terms` pages.
- Account management: clickable profile avatar → picker (curated card art + a `web/static/avatars/`
  folder for custom images); an `/account` page to change username / password / delete the account.
  The `/api/auth/{avatar,username}` web endpoints re-set the `cartomania_session` cookie with the updated
  user (so SSR stays in sync); `/api/auth/delete` clears it. Player has an `avatarUrl` column.
- Multilanguage (en / pt / es) with a flag language selector in the top bar; persisted via cookie and
  SSR-resolved. The whole UI is translated, and **card name/description are localized in the gallery**
  via the `CardTranslation` table (the duel keeps canonical English by design — see the gotcha).
- **Friends panel z-index fixed**: backdrop z-index raised to 200 (was 40, behind top-bar at 50); dock
  → 210, toast → 220 so they all float above the top bar correctly on desktop and mobile.
- **Card outline**: 8-direction text-shadow using `--cc-outline-size` (em-fraction, default 0.09) and
  `--cc-outline-color` (default `#000`). Both are live CSS vars tunable from `/cards-lab`. Uses
  `calc(var(--cc-outline-size, 0.09) * 1em)` directly (no intermediate `--osh`/`--oc` vars that
  can silently fail in chained calc()). Text color and position baked from user's exported values.
- **`/cards-lab` controls**: non-working sliders (`Attr outline base`, `Attr value/label outline`)
  removed; `Outline color` picker now wired to `--cc-outline-color`; `Outline thickness` slider for
  `--cc-outline-size` (em-fraction 0.02–0.16); `Number size` min lowered to 0.08.
- **Font**: `--font-display` in appShell.css changed from `'Draco'` to `'Morpheus'` so the whole site
  (nav, gallery, dashboard) uses Morpheus. `card-attribute-value` also switched to Morpheus. Only
  `card-attribute-label` (MAGIC/MIGHT/FIRE labels) keeps Draco (Exocet).
- **Challenge notification**: the dashboard polls `GET /game/active/mine` every 4 s; when a new game
  appears where the current user is playerB (challenger ≠ BOT) and the game wasn't known before, a
  `.challenge-toast` floats at the bottom with Accept → navigate to game and Decline → surrender. First
  poll silently seeds `seenGameIds` (localStorage key `cartomania-seen-games`) so existing games never
  trigger a spurious notification. Friends are cached in `friendsCache` (Map id→username) for the name
  display. Chat via the floating dock in FriendsPanel already works end-to-end (`fetchCartomaniaFriendChat`
  / `sendCartomaniaFriendMessage`).
- **FriendsPanel auto-refresh**: friends list + requests auto-refresh every 8 s; chat auto-refreshes
  every 3 s while the dock is open (new messages only, scroll stays at bottom).
- **Online presence**: `Player.lastSeenAt DateTime?` (migration `20260613000000_add_player_last_seen_at`).
  Updated on every `GET /friends` call via `touchLastSeen()`. Returned in all friend summaries.
  Frontend: online = < 2 min ago (green dot), away = < 10 min ago (gold dot), offline = gray dot.
- **Card aspect ratio unified (2026-06-13)**: the gallery, duel page, classic page and `FlippableCard`
  used to pass the wrong `430/670` aspect to `CardComposite`, distorting every card vs. `/cards-lab`
  (which uses the correct `1444/1920` default). All call sites are now `1444/1920`. See the aspect-ratio
  gotcha above.
- **Repo went public-safe (2026-06-13)**: GitHub repo has a description + topics; README rewritten for
  accuracy (real `:3000` port, Attribute Duel API, not the old CLASSIC `play-card`/HP examples); the two
  `howToAccessDatabase.md` ops files (leaked `ssh root@bobagi.space`) were removed. `.env`/`web/.env`
  are git-ignored and were never committed (verified across history).

## TODO / pending work (next session)

> Ordered roughly by priority. Update/trim as items land.

- **[ON BRANCH — review] Duel battlefield — masked card art (2-step).** **Step 1 DONE (2026-06-20, on
  `main`):** removed the "your card here" / "waiting" slot placeholders + framed outline. **Step 2 DONE
  (2026-06-20/21, on branch `feat/duel-circle-art`, DEPLOYED live for review — `main` is the stable
  fallback):** `.lb__arena` is a felt disc that masks the played card's creature ART into two halves
  (top = opponent on reveal, bottom = you), with **rotating arcane rings** (`.lb__arena-rings`). Iterated
  per 2026-06-21 feedback to the current **art-only** look: the whole-card overlay was removed; the art is
  sized to the circle's vertical RADIUS (centred square, sides intentionally empty); and the attribute
  selector now lives **inside the disc** (`.lb__picker` → `.lb__pick`, icon + value per power). See the
  "Duel board layout" gotcha for the full structure. **Open follow-ups before merge:** (a) the user plans to
  fill the empty left/right side spaces of the disc with something — TBD; (b) the opponent half is empty
  while its card is hidden (no indicator) — add one if wanted; (c) tune the picker position / the square's
  pole-clipping if needed. To revert the whole thing: `git checkout main` + rebuild + `pm2 restart
  cartomania-web`.

1. **[SECURITY — do first] Rotate the live `admin`/`alice` passwords.** The live `.env` does NOT set
   `ADMIN_PASSWORD`/`ALICE_PASSWORD`, so the seed fell back to `admin123`/`alice123` — a publicly-known
   ADMIN login on `cartomania.bobagi.space` (the weak default is visible in the now-public
   `prisma/seed.ts`). The user opted to do this manually. Fix: add strong values to `/opt/cartomania/.env`
   then `docker compose up -d cartomania` (the seed `upsert` uses `update:`, so it rotates on restart).
   Consider also hardening `seed.ts` to refuse the weak default when `NODE_ENV=production`.
2. **Unauthenticated duel endpoints.** `GET /game/state/:id` and the duel actions are unauthenticated —
   anyone with a `gameId` can read/act on a match. Acceptable for a portfolio; harden (auth guard +
   "is this player in this game" check) if it ever matters.
3. **Finish Google sign-in** (currently scaffolded, frontend-only — see the gotcha). Needs: the OAuth
   token exchange + `id_token` verification in `web/src/routes/auth/google/callback/+server.ts`, a
   backend find-or-create-Player-by-Google-identity endpoint (Prisma migration adding `googleId`/`email`
   to `Player`), then `setCartomaniaSessionCookie`. Flip on with `PUBLIC_GOOGLE_AUTH_ENABLED=true` +
   `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`.
4. **Duel realtime: swap polling for WebSockets** (optional polish). The client polls `GET state` every
   1 s; the `game` WS gateway already emits `state` to room `game:<id>`. Would need an nginx
   `location /socket.io/` → `:3056` and a socket.io-client. Lower priority — polling works fine.
5. **`.nvmrc` says 20 but only Node 18.20.5 is installed** on the VPS; the web build needs
   `npm_config_engine_strict=false`. Either install Node 20 (and drop the flag) or change `.nvmrc` to 18.
6. **Minor cleanup:** `CardComposite` inline-styles the attribute value/label at `5cqh`/`3cqh`, but
   `game/fonts.css` overrides both with `!important` (`--cc-val-size` 8cqh / `--cc-label-size` 5.6cqh) —
   the inline values are dead. Harmless, but worth removing to avoid confusion.
