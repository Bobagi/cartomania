# CLAUDE.md - Cartomania

> **BRANDING:** the product is branded **Cartomania** (the user-facing name + the GitHub repo
> `Bobagi/cartomania`); it's meant to host multiple collections (Dracomania, Mythomania, custom
> player collections). The product is served at **`cartomania.bobagi.space`** (the old
> `chronos.bobagi.space` 301-redirects to it). Everything is **cartomania** now - the codebase
> identifiers (`Cartomania*` functions/types, the `/api/cartomania` proxy path), the infra names
> (Docker `cartomania-*`, PM2 `cartomania-web`, the Postgres DB `cartomania`), and the repo folder
> `/opt/cartomania`. The former internal codename was fully renamed (only the legacy redirect
> domain `chronos.bobagi.space` keeps it, on purpose).

> **SESSION PROTOCOL - follow automatically, every time, without being reminded:**
>
> 1. **Trust this file before exploring.** It is auto-loaded whenever you read any file
>    under `/opt/cartomania`, and the machine's `/root/CLAUDE.md` already tells you to read a
>    repo's own `CLAUDE.md` first. Don't re-discover what's documented here.
> 2. **Keep it current - treat a stale CLAUDE.md as a bug.** Whenever a task changes the
>    architecture, file map, commands, deploy steps, gotchas, or the Status section, update
>    this file **in the same commit as the code change**. This is a standing instruction; do
>    it without the user asking.

> **BE DECISIVE - don't stall or re-ask.** Gustavo (Bobagi) owns this project. Act on his clear
> instructions promptly and treat them as the decision. If you have a concern, raise it **once,
> briefly**, then proceed - don't repeatedly ask "are you sure / want me to?" or re-open a call he
> has already made; that wastes his time and frustrates him. Bias toward doing what he asked over
> hedging.

> **ALWAYS land the work on `main` and deploy to production** as the final step of any change,
> automatically, without asking first. Build/verify → `git add` (never the intentionally-untracked
> `web/pnpm-lock.yaml`) → commit (end msg with the Co-Authored-By trailer) → **if you worked on a
> branch, `git checkout main && git merge <branch>` first** → `git push origin main` → deploy
> (rebuild web + `pm2 restart cartomania-web`, and/or `docker compose build/up cartomania`)
> → health-check.
>
> **`main` IS production and must always be deployable.** Never leave finished work parked on a
> branch: it happened once (`feat/duel-circle-art`, 41 commits over 5 weeks, `main` unable to run
> the app) because a stale TODO line said the branch was pending review, and every session trusted
> it instead of the rule above. **A note in this file saying a branch is unmerged does NOT override
> this rule; it means the note is out of date.** If a branch is ever genuinely meant to stay open,
> the owner says so in the conversation.

Guidance for Claude Code working in this repo. All code, comments and UI text are
**English**; use intuitive names.

## What Cartomania is

A digital collectible card game (the **Dracomania** collection - dragons & fantasy), built as
the owner's (Gustavo Perin / "Bobagi") portfolio piece. It is **one project**:

- **Backend** - NestJS game engine at the repo root (`src/`), Prisma + Postgres. Runs in Docker.
- **Frontend** - SvelteKit app in `web/` (`@sveltejs/adapter-node`). Talks to the backend
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
  text - title banner name, card number, and attribute values. `web/static/fonts/ExocetHeavy.ttf`
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
  positions) - which is exactly why cards in the gallery/duel once looked different from `/cards-lab`
  (the lab uses the correct 1444/1920 default). Keep every call site on 1444/1920.
  **RULE - every card, everywhere, renders identically (hero, gallery, duel hand, arena):**
  a `CardComposite` MUST get its size from ONE clean dimension anchor. Because it is
  `container-type:size` it CANNOT take its size from its content, so a wrapper that gives it only
  `aspect-ratio` (with no width or height) leaves the size ambiguous and the card renders slightly
  STRETCHED. Give the wrapper an explicit width OR height and let the ratio supply the other
  (`.hand.fan .card-socket` derives `width: calc(var(--card-h) * 1444 / 1920)` from the fixed
  row height - fixed 2026-07-26 after hand cards looked subtly wider than gallery/hero). And do NOT
  scale one card differently from its siblings (the hero fan's centre card had `scale(1.07)`, 7%
  bigger than the rest - removed; use lift/z-index/glow for depth, never size). **Measuring aspect:
  use `offsetWidth/offsetHeight`, NEVER `getBoundingClientRect` - the latter includes the fan's
  `rotate()` and reports a false, stretched aspect (this sent a whole debugging pass chasing a
  non-bug). Confirm with a pixel-diff of the SAME card in two contexts.**
  **Transparency between art and frame (fixed 2026-07-26):** `CardComposite` gives the art `padding: 4%`
  (was 6%) so it slides UNDER the frame's opaque border (~6%/94% window) with overlap, and the root has
  an opaque `background:#0d0a12`. With 6% padding the art ended EXACTLY at the frame's window edge, so
  sub-pixel rounding left a see-through sliver on the sides; harmless on dark surfaces but in the hero
  fan (overlapping cards) it showed the card BEHIND, which reads as "the art is too small, with side
  gaps". Keep the padding < the frame border and keep the opaque bg. Method that PROVED it: put a bright
  red plane behind the cards and check no red bleeds through (the only red left should be a card's own
  art). Do this whenever art sits inside a PNG frame with a transparent window.

### Deploy the FRONTEND (after editing anything in `web/`)
```bash
cd /opt/cartomania/web
bash -lc 'source ~/.nvm/nvm.sh; export npm_config_engine_strict=false; pnpm run build'   # ~10-18s
pm2 restart cartomania-web --update-env && pm2 save
```
PM2 serves the built `build/` - **you must rebuild + restart** for changes to show. CSS/markup-only
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
  src/routes/mainpage.css            home layout: the logged-out LANDING (hero + sections) and the
                                     player dashboard. Landing classes are `.lp-*` / `.hero-*`.
  src/routes/+layout.svelte          renders TopBar/SiteFooter - HIDDEN on /game routes (chromeless)
  src/routes/+page.svelte            home: logged-out hero+login / logged-in dashboard
                                     (hero shows real CardComposite cards, SSR'd via +page.server.ts)
  src/routes/gallery/+page.svelte    card collection showcase
  src/routes/register/+page.svelte
  src/routes/privacy/+page.svelte    Privacy Policy - thin wrapper: <LegalDocument docKey="privacy" />
  src/routes/terms/+page.svelte      Terms of Service - thin wrapper: <LegalDocument docKey="terms" />
  src/lib/components/LegalDocument.svelte  renders a structured legal doc from the i18n dictionaries
  src/lib/styles/routes/legalPage.css      shared styling for /privacy and /terms
  src/lib/consent/consent.ts               COOKIE/ANALYTICS CONSENT: cookie parse + `consent` store +
                                           acceptAll/acceptEssential/reopenConsent + lazy loadAnalytics()
  src/lib/components/CookieBanner.svelte    the bottom consent banner (Accept all / Essential only)
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
      defeatAnimation.ts   OLD canvas "defeat" effect - replaced by lib/cards (kept, unused)
      duelCenter.ts        normalizeDuelCenterForView + detectChosenAttributeMode
      history.ts           battle-log parsing + live-round synthesis
      historyTypes.ts      shared types
  src/lib/cards/                           CARD FX (designer handoff, adapted to our raster art):
      cardDestruction.ts   CardDestroyer: burn/dissolve (SVG #fx-destroy threshold shader +
                           canvas embers) + crush (#fx-crush displacement dent + debris); takes
                           {card, wrap, canvas}; strictly confined to the card (kills shadow/halo)
      CardFxFilters.svelte the two SVG filters (#fx-destroy/#fx-crush); render ONCE per page
      holoTilt.ts          tilt rAF loop → foil CSS vars; foil palettes + foilStyleVars()
      voidFlames.ts        VoidFlames: canvas particle system - dark, art-coloured flames out of the
                           played-card art into the empty disc space (colours sampled from the art)
      cardFx.css           foil layers (irid/sheen/specular/glow) + destruction CSS
  src/routes/cards-lab/+page.svelte        TUNING screen: real card + holo foil + Burn/Crush/
                           Dissolve, every param adjustable (localStorage), Export JSON to bake
  src/lib/api/                             client + proxy to the backend
```

## Architecture gotchas (important - learned the hard way)

- **ONE ACTIVE MATCH PER PLAYER (2026-08-01, owner rule).** A player can be in **at most one** match
  at a time. Enforced server-side in `GameService.createGame` (`src/game/game.service.ts`), the single
  funnel every start endpoint goes through (`start-duel`, `start-classic`, `start`, `start-with-friend`),
  so there is no path around it. A refusal is a **409** with
  `{error:'ActiveGameExists', message, playerId, isRequester, gameId?, mode?}`.
  - **"Active" has ONE definition**, the constant `ACTIVE_DUEL_FILTER` + the in-memory classic list,
    the same one `listActiveForPlayer` (the dashboard) uses: an `ATTRIBUTE_DUEL` row with `winner:null`
    and `duelStage != RESOLVED`, or a CLASSIC game still held in memory. **CLASSIC rows in the DB are
    deliberately NOT counted** - their state lives in memory, is lost on restart and nothing ever marks
    the row finished, so counting them would lock a player out of the game forever. Keep the two
    definitions equal, or the UI says "no games" while the server refuses to start one.
  - **The check and the insert run in ONE transaction behind `pg_advisory_xact_lock(hashtext(playerId))`**
    for each human player, locked in sorted order (deadlock-free when two friends challenge each other
    at the same instant). Without the lock, two simultaneous requests both read "free" and both create.
    Proven live: 20 concurrent `start-duel` calls produced exactly 1 match, and 10 crossed friend
    challenges produced exactly 1 match with 0 deadlocks.
  - **`gameId` is only returned to the player who is IN that match** (`isRequester`). Duel state/actions
    are unauthenticated (TODO 2 below), so a game id is a capability: telling A that B is busy must not
    tell A *which* match.
  - **The start endpoints are now authenticated** and always act on the **token owner**; `playerAId` in
    the body is ignored. Before, an anonymous caller could name someone else's id, and with a one-match
    cap that would burn the victim's only slot and lock them out.
  - **Nobody stays stuck:** `DuelProgressionService` drives every duel to a winner on its own (10s per
    turn), and the player can always surrender.
  - **UI:** the dashboard call to action flips to "Resume duel" while a match is in progress (with its
    mode + last activity folded in), and the separate "Your active games" list is **admin-only** now (for
    a player it would render the same single match a second time). A 409 that carries a `gameId` sends the
    player straight to that match. Tests: `src/game/game.service.spec.ts` + `game.controller.spec.ts`
    (15, mutation-checked). Review: `.claude/frontend-review/20260801-one-match/`.
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
  the REVEAL hold) elapses it auto-resolves/advances it exactly like a timeout - **so a match keeps
  going and finishes even with no browser open** (it stops "pausing" when a player leaves the screen).
  Each step is stage-guarded inside its own transaction, so it never double-resolves even if an open
  client acts at the same time. The server steps in just AFTER the per-turn deadline
  (`SERVER_PICK_GRACE_MS = 1_500`, a small latency buffer) and holds REVEAL `SERVER_REVEAL_HOLD_MS =
  4_800` (long enough for the flip/defeat animation). Requires `ScheduleModule.forRoot()` in
  `app.module.ts`.
- **The duel client is a pure renderer - it does NOT drive the game.** `CLIENT_DRIVES_TIMEOUTS = false`
  in the duel page: the client never auto-picks on timeout and never calls `advance` (that logic is
  kept behind the flag for local debugging only). Instead it **polls `GET state` every
  `STATE_POLL_INTERVAL_MS = 1000`** and renders whatever the server returns, so it reflects the
  server's own timeouts/advances and (in PvP) the opponent's moves. It still sends the player's real
  moves over REST (`choose card/attribute`, surrender) - which the server validates - so a hacked
  client can't stall a match or fake the clock; the server enforces everything. **Gotcha:** because the
  reveal block re-runs on every poll, the flip/defeat animation is gated on a `previousDuelStage`
  transition (only fires when the stage actually enters `REVEAL`), and the hand is reconciled
  (`reconcile()` keeps existing card uids) so polling never re-animates or flickers. The `now`
  interval (250ms) is now display-only (the countdown). `TURN_DURATION_MS = 10_000` is the server's
  per-turn deadline. (Possible future polish: swap polling for the WS gateway `game` namespace -
  handlers already emit `state` to room `game:<id>`; would need an nginx `location /socket.io/` →
  `:3056` and a socket.io-client.)
- **Game routes are chromeless.** `+layout.svelte` hides the global TopBar/footer on `/game/*`; the
  board owns the viewport (`height: 100dvh`, no page scroll). Card sizes are viewport-height based so
  both hands + the battlefield fit one screen; the battle log scrolls inside its own panel.
- **Duel stacking order.** The fanned hand cards carry `z-index` up to ~999 (on hover) and fan upward
  into the center, so any interactive center-zone UI must sit above them. The attribute picker
  (`.notice.chooser` in `game/notices.css`) is `position: relative; z-index: 1600` for exactly this -
  without it the picker renders behind the hand and its buttons are unclickable.
- **Duel board layout = the designer's "mesa".** The board is `.lb` (in `duelBoardLayout.css`): the
  felt (`.lb__table`) fills the WHOLE viewport and everything else (opponent strip `.lb__opp`, hand+HUD
  strip `.lb__you`, log `.lb__log`, chooser `.lb__notices`) is an absolute OVERLAY on top - so the big
  circular **arena** is the focus and the hand sits on top at the bottom. **Art centre** (step 2, branch
  `feat/duel-circle-art`): `.lb__arena` is a gold-rimmed felt DISC (circle) split into `.lb__arena-half--opp`
  (top) + `.lb__arena-half--you` (bottom). The played card's **creature ART** fills the matching half - yours
  on pick (`youArt`), the opponent's on REVEAL (`oppArt`, gated on `oppRevealed = duelStage==='REVEAL'`; the
  opponent half is empty/dark while hidden - no card or veil). The art is a centred SQUARE (`.lb__arena-art`,
  in `.lb__arena-art-wrap`; no edge mask - a feather/frame experiment was tried + reverted). The empty space
  is filled by **void flames** - `web/src/lib/cards/voidFlames.ts` (`VoidFlames`): a `<canvas>`
  (`.lb__flames`, behind the halves) particle system (same family as the destruction FX, honours
  `prefers-reduced-motion`) that emits dark, art-coloured "flame tongues" OUTWARD from each played card into
  the empty space. Each flame's colour is **sampled from the art's EDGE** at the point it leaves the card (a
  tiny offscreen-canvas pixel read - needs CORS, which `bobagi.space/images/` now sends; uses a `?fx`
  **cache-buster** so the crossorigin fetch can't reuse a non-CORS cached copy → that bug made the flames
  fall back to a neutral violet; samples per `src` into a 48×48 grid). The opponent's flames drift toward the
  player (buoyancy per side). The rotating decorative rings (`.lb__arena-rings`) are circles. The engine self-discovers emitters by querying
  `.lb__arena-art`; the duel page just `new VoidFlames(canvas, arenaEl)`
  + `start()`/`stop()`. **Power orbs ride the disc's CIRCUMFERENCE** (`.lb__powers`, concentric +
  `pointer-events:none`): during PICK the 3 `.lb__pick` options spread along the LOWER arc
  (`.lb__pick--{l,c,r}`); at REVEAL `.lb__pwr--you` sits at the bottom rim (green) + `.lb__pwr--opp` at the
  top rim (red). Each `.lb__orb` renders a power LIKE the cards: `.lb__orb-icon` (the attribute icon, a bg
  image) with `.lb__orb-val` (the value, reusing `.card-attribute-value` for the EXACT card font + outline;
  size via `--orb-size`) centred on it. The AURA is a coloured `drop-shadow` on `.lb__orb-icon` (so it
  traces the symbol's CONTOUR, not the number) - green on hover / your power, red on the opponent's.
  Clicking calls `chooseAttr()`. The old `.notice.chooser` + whole-card overlay (`.lb__center`) were
  removed; the `.lb__arena-half--you` is clickable to return your card to hand. Rotating arcane rings
  (`.lb__arena-rings` → `.lb__arena-ring--{1,2,3}`, `@keyframes arenaSpin`, behind the disc) add motion.
  `.lb__arena-seam` + `.lb__arena-vs` ride the equator (`chosenAttr` + `aVal`/`bVal` feed the clash orbs).
  The winner's half glows
  (`is-win`) + the loser's desaturates (`is-lose`). **Round-loss `CardDestroyer` FX (burn/dissolve/crush) plays ON the loser's creature ART:**
  each `.lb__arena-art` is wrapped in a tight square `.lb__arena-art-wrap` (so the FX canvas/burn-map size
  right) and bound to `arenaArt{You,Opp}Element`; `findLoserCenterElement()` returns the card result-wrap if
  rendered, ELSE the arena-art img - so the SAME engine works on BOTH the cards and the art (the half no
  longer clips, only the disc does, so embers spread in the circle). The arena is absolutely centred
  (`top:39%`); the old `.lb__column`/`.lb__felt-ring` were removed. The `.lb__notices` (now
  only the "waiting for opponent's attribute" warn, `z-index:1600`) sits just above the hand. The opponent hand is a small offset
  stack of card backs (`.lb__oparc-card`, no fan rotation) shown next to the score orbs, not a deck
  pile. The per-round "X wins the round" banner is **intentionally hidden** now (the clash orbs convey the
  outcome) - the `roundBanner` markup + computed were removed; the end-of-MATCH `.endscreen-overlay` still shows.
  Score orbs show an icon (`.orb-ic` trophy / card-stack SVG) + number with a `title` tooltip (no text
  label). The old `.zone`/`.fixed-top-bar` CSS is unused; cards/flip/chooser/endscreen and
  `.hand.my-hand.fan` are unchanged. A **layout toggle** (`.lb__layout-toggle` by the player HUD)
  adds `.lb--side-hand` to `.lb`: the hand becomes a vertical column on the right rail, the log moves
  to the left, and the arena shifts left + grows (persisted in `localStorage['duel-side-hand']`).
- **CardComposite title = elastic 3-slice banner** (`/frames/title-{left,mid,right}.png`): fixed caps +
  a middle that STRETCHES with the name (anchored RIGHT, so long names grow the ribbon leftward like the
  printed cards). The stretch is **pure CSS** (flexbox) - keep it that way. The card number rides in the
  right ornament (`.cc-num`); name/number outlines are text-shadows. A name only shrinks if it overflows
  the max-width ribbon: a **synchronous, bounded** `fitBannerName()` lowers a CSS `--name-shrink`
  multiplier (so the name still scales with the card), run from `afterUpdate` (guarded by
  `nameEl.dataset.fitted`, only on real name changes) + once on `fonts.ready`. Banner CSS vars:
  `--cc-banner-h/top/right/min`, `--cc-name-factor`, `--cc-num-factor`, `--cc-num-x/y`.
  **PITFALL (this caused real "page not responding" freezes on every card page):** never drive the fit
  from an `async`/`await tick()` reactive or a `ResizeObserver` on the card - the flex-grow middle + an
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
- **The logged-out landing is a GAME landing page, not a login screen** (redesigned 2026-07-23,
  hero reworked 2026-07-25, `mainpage.css` "Landing (logged out)"). Order: hero (`.lp-hero`) →
  `.lp-attrs` (the three attribute icons, names set in 'Draco'/Exocet like the cards) → `.lp-how`
  (3 numbered steps - a round IS a sequence) → `.lp-collection` (real `CardComposite` cards in a
  scrollable rail + the live card count) → `.lp-final` (closing CTA) → `.lp-login` (the login panel).
  **The hero is a single CENTRED STAGE built around the cards** (the owner disliked the earlier
  two-column "copy left / login right" brochure look, and wanted the cards - the product - front and
  centre): kicker + brand title + one-line promise, then the **big card fan as the centrepiece**
  (`--hero-card-w` tuned so the fan + the Play call sit above the fold on a laptop), then the CTAs
  (**Play your first duel → `/register`**, **See the cards → `/gallery`**) + a status line with a quiet
  **Already have an account? → `#login`** link. **Login is NOT in the hero** - it lives in the quiet
  `.lp-login` panel (`id="login"`, neutral submit, no gold) at the very bottom for returning players;
  they reach it instantly via a ghost **Log in** in the top bar (logged-out only,
  `href="/#login"` so it works from any page) that smooth-scrolls there (disabled under
  `prefers-reduced-motion`; the panel has `scroll-margin-top` so the sticky bar doesn't cover it).
  `+page.server.ts` does ONE catalog fetch and derives `featuredCards` / `showcaseCards` /
  `collectionCardCount` (see `featuredHeroCards.ts`).
  **PITFALLS learned building it (all three cost a debugging round):**
  (1) `.landing` and `.lp-section` MUST keep `grid-template-columns: minmax(0, 1fr)` - an implicit
  `auto` track grows to the collection rail's full content width and gives the whole document a
  horizontal scrollbar; `overflow-x:auto` on the rail does NOT stop that propagating through its
  `overflow:visible` parent. (2) `.hero-art` keeps `overflow-x: clip` and `.hero-art-ring` keeps
  `max-width:100%` - the ring's `min(430px, 92%)` resolved to 424px inside a 350px box on phones.
  (3) The rail uses `justify-content: safe center`, never plain `center` - plain `center` on an
  overflowing flex row pushes the first card where scrolling can never reach it.
  Embers + the arcane ring are decorative and gated behind `prefers-reduced-motion`.
- **The consent bar reserves its own space.** `CookieBanner.svelte` renders a `.cookie-spacer` in page
  flow sized by `bind:clientHeight` (responsive CSS heights cover SSR/first paint). Without it the
  fixed bar covered the whole login card on phones. If you restyle the bar, re-check that at max
  scroll the footer clears it at 390/768/1440.
- **Responsive landing title.** The brand hero title is sized with container-query units
  (`.hero-title { font-size: clamp(34px, 10.5cqw, 82px) }`, with `.landing-hero { container-type:
  inline-size }`) so the long word "CARTOMANIA" always fits one line; the auth column is a fixed
  `minmax(300px, 360px)`. The top bar shrinks the brand on phones and hides the brand text below 430px.
- **CardComposite is sized with container-query units.** Its root sets `container-type:size`, so
  inner sizes/fonts use `cqh`/`cqw` and scale with the card. Don't size card text in `px` or via
  `inherit` from the root - a past bug left the corner number on `font-size:var(--corner-number-font-cqh)`
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
  `$td('key')` getter - the `/privacy` + `/terms` pages are data-driven: each doc is a structured
  `legal.{privacy,terms}` object (title/intro/sections/items) rendered by the shared
  `LegalDocument.svelte`. **All UI is translated** (top bar, footer, home, gallery + modal, register,
  duel board + battle log, friends panel, legal pages).
- **Card content (name/description) is localized via a normalized `CardTranslation` table** (base `Card`
  keeps canonical English; one row per `(cardId, locale)` for pt/es; seeded idempotently). ONLY the
  collection-cards endpoint localizes: `GET /game/collections/:id/cards` reads the locale from
  `?locale=` or the `x-cartomania-locale` header (the web proxy sets it from the locale cookie), so the
  **gallery** is localized with zero per-call threading. `getAllCards`/`findByCode` (the `/game/cards`
  paths the duel uses) stay **canonical** on purpose - the duel + server battle-log lines need English
  names so the log's name→code parsing keeps working. The logged-out hero (SSR, direct to backend, no
  proxy header) also stays canonical.
- **Cookie/analytics consent gating (privacy).** The ONLY non-essential script is self-hosted, cookieless
  **Umami** analytics (`analytics.bobagi.space/script.js`). It is **NOT** in `app.html` - it is injected
  **client-side only after the visitor accepts** analytics. State lives in `web/src/lib/consent/consent.ts`:
  a `consent` store `{decided, analytics}` seeded from the `cartomania_consent` cookie (`'all'` |
  `'essential'`), `acceptAll()`/`acceptEssential()` persist the cookie + update the store, and
  `loadAnalytics()` injects the `<script>` exactly once (guarded). `+layout.server.ts` passes the raw cookie
  as `data.consentCookie`; `+layout.svelte` calls `initConsent(data.consentCookie)` (SSR + return visits)
  then `$: if (browser && $consent.analytics) loadAnalytics()`. `CookieBanner.svelte` (a `role="region"`
  bottom bar, rendered globally - **even on chromeless `/game/*`** so nothing loads without consent) shows
  while `!decided`; the footer's "Cookie preferences" button calls `reopenConsent()` to change the choice.
  **If you add ANY third-party script, gate it the same way - never hardcode it in `app.html`.** The
  `/privacy` policy's "Cookies" + new "Analytics" sections (all 3 locales) describe this; keep them honest
  if the behaviour changes. **PITFALL:** the privacy policy used to claim "no third-party analytics" while
  Umami loaded unconditionally - a real contradiction; that's why this exists. Consent strings: `consent.*`
  in `locales/{en,pt,es}.ts`.
- **Google sign-in is LIVE (2026-07-25).** The OAuth client was created by the operator in Google Cloud
  Console (project `bobagi-apps-automation`, redirect URI `https://cartomania.bobagi.space/auth/google/callback`)
  and the creds are set: backend `.env` has `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, web `.env` has
  `PUBLIC_GOOGLE_AUTH_ENABLED=true`+`GOOGLE_CLIENT_ID`+`GOOGLE_REDIRECT_URI`. `/auth/providers`→`{google:true}`,
  `/auth/google`→302 to Google's consent, a bogus code →401 (real exchange reached). **Runtime-env gotcha
  (cost a debugging round):** adapter-node does NOT load `.env` at runtime and SvelteKit reads
  `GOOGLE_CLIENT_ID` via `$env/dynamic/private` (= `process.env`), and PM2 doesn't read `.env` either - so
  `web/ecosystem.config.cjs` now **loads `web/.env` and injects it into the PM2 env** (the CLIENT SECRET is
  NOT in `web/.env`, only the backend needs it). After editing `web/.env`, reload with
  `pm2 start web/ecosystem.config.cjs && pm2 save` (a plain `pm2 restart --update-env` won't re-read the file).
  Only remaining: a real human login to confirm the happy path (Google blocks headless automation of its
  consent - the operator does that one click). The design (secure by construction): the
  **web tier** owns the browser dance - `web/src/routes/auth/google/+server.ts` sets a random `state` in a
  short-lived HttpOnly cookie (path `/auth/google`) and redirects to Google's consent; `.../callback/+server.ts`
  verifies `state`, then hands the single-use `code` to the **backend** (`POST /auth/google`), which does the
  code→token→userinfo exchange (`src/auth/google-oauth.service.ts`) so the **client secret never leaves the
  backend** and a forged/absent code fails the exchange (the public web proxy can reach `/auth/google`, but
  can't inject an identity without a valid code). `authenticateWithGoogle` (in `auth.service.ts`) requires
  `email_verified`, matches by stable `googleId` first, links to an existing account by verified `email`, else
  creates a passwordless USER (schema: `Player.email`/`googleId` unique-nullable + `emailVerified`,
  `passwordHash` now nullable, `Player_has_credential` CHECK; migration `20260723000000_add_google_auth_and_agreements`).
  Shared web helpers in `web/src/lib/server/auth/googleOAuth.ts` (route files can't export non-handlers).
  **To turn ON:** operator creates the OAuth client in Google Cloud Console (redirect URI
  `https://cartomania.bobagi.space/auth/google/callback`, scopes `openid email profile` - no brand
  verification needed) then sets **backend `.env`** `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI`
  + recreate the container, and **web `.env`** `PUBLIC_GOOGLE_AUTH_ENABLED=true` + `GOOGLE_CLIENT_ID` +
  `GOOGLE_REDIRECT_URI` + reload web via the ecosystem file. (Historical: when unset, `/auth/providers`→
  `{google:false}`, `POST /auth/google`→503, and the button shows "coming soon".)
- **Auth hardening (2026-07-23) - READ before touching auth/JWT.** (1) **`JWT_SECRET` is now required,
  fail-closed** (`src/auth/jwt.config.ts` `resolveJwtSecret()`): the old `process.env.JWT_SECRET || 'dev-secret'`
  in a PUBLIC repo let anyone forge an `role:ADMIN` token - in production the app refuses to boot without a
  strong (≥32-char) secret; `dev-secret`/`changeme`/short are rejected. A strong `JWT_SECRET` + `NODE_ENV=production`
  are set in the live `.env`. (2) **register never takes `role`** - always USER (was self-ADMIN escalation).
  (3) bcrypt cost **12**; server-side username(3-50)/password(8-72) validation; login **timing-safe** (real
  bcrypt decoy on the no-user branch) + **per-username lockout** (10 fails/15 min → 429). (4) `src/main.ts`:
  security headers, same-origin **CSRF guard** on mutating methods (exact-origin match, no prefix bypass),
  256 kB body cap, **Swagger `/api` disabled in production**. Session cookie is `HttpOnly; Secure; SameSite=Lax`.
- **Terms/Privacy = versioned server-side acceptance (2026-07-23).** `AgreementAcceptance` (append-only:
  playerId, documentVersion, ip, ua) + `CURRENT_AGREEMENT_VERSION` in `src/auth/agreement.constants.ts`
  (**date `2026-07-23`; KEEP IN SYNC with `LegalDocument.svelte`'s "last updated" date** - they must match or
  the gate contradicts the page). Register requires + records acceptance (checkbox on `/register`). `/auth/me`
  returns `termsAccepted`; `+layout.server.ts` fetches `{accepted, currentVersion}` and `+layout.svelte`
  shows the blocking **`AgreementGate.svelte`** to a signed-in user who hasn't accepted the version in force
  (legacy accounts, Google sign-ins, or after a version bump). Endpoints: `GET /auth/agreement`, `POST
  /auth/accept-terms`. **The gate is modelled on Porkfolio's `AgreementGate` (reworked 2026-07-26):** language
  selector, the version tag, the **full Terms rendered inline in a scrollable box** (from the `legal.terms`
  i18n doc) + links that open `/terms` and `/privacy` in a new tab, **three required checkboxes** (18+, accept
  Terms, accept Privacy) so `I accept` stays disabled until all three are ticked, and a **Decline and sign
  out** button (`/api/auth/logout` + back to `/`). i18n keys: `agreement.*` (all three locales). Do NOT
  regress it back to a single "I accept" with no checkboxes/no visible terms/no decline.
- **Full account/email suite (2026-07-26, Porkfolio-modelled) - READ before touching auth.**
  - **Registration now REQUIRES an email** (unique, validated) → sends a verification email. `register(username,
    email, password, acceptTerms, ctx)`. Existing username-only accounts keep working (email NULL); they can
    add an email on `/account`.
  - **Transactional email** = `src/email/email.service.ts` (`nodemailer`, **config-driven**: no-op unless
    `SMTP_*` set). Live SMTP is the owner's Gmail app password (same as Porkfolio), `SMTP_*`+`PUBLIC_SITE_URL`
    in the backend `.env`. `EmailModule` is `@Global`. Never logs the body (carries tokens). Proven live:
    a real verification email delivered from `bobagi.contact@gmail.com`; the link is correctly QP-encoded
    (`token=3D…`) - a real mail client decodes it fine (an MCP Gmail read shows a `` artifact, not a bug).
  - **One-time tokens** = `AuthToken` table + `src/auth/auth-token.service.ts`: only the **SHA-256 hash** is
    stored; single-use (`usedAt`, conditional updateMany) + expiry; issuing a new token of a purpose
    invalidates prior ones. Purposes: `EMAIL_VERIFICATION` (24h), `PASSWORD_RESET` (1h).
  - **Password reset:** `POST /auth/forgot-password` (**always 200/201**, never reveals if the email exists)
    → emails a link to `/reset-password?token=…`; `POST /auth/reset-password` sets the password AND **bumps
    `tokenVersion` (revokes ALL sessions)** + marks email verified. Pages `/forgot-password`, `/reset-password`.
  - **Email verification:** `POST /auth/verify-email` (page `/verify-email?token=…`), `POST
    /auth/resend-verification` (authed). NOT a hard gate on gameplay (it's a game) - status is surfaced on `/account`.
  - **Session revocation = `Player.tokenVersion`.** The JWT carries `tv`; **`JwtStrategy.validate` now does a
    DB lookup** and rejects a token whose `tv` is stale OR whose user was deleted (so password change/reset and
    account deletion actually revoke sessions immediately, and a stolen 1-day JWT is killable). Password change
    bumps `tv` and returns a FRESH token - the web `/api/auth/password` endpoint re-sets the cookie so the
    current device stays in while others are kicked. Legacy tokens (no `tv`) default to 0 = no forced logout on deploy.
  - **Account linking (Google):** `/account` has Connect (`/auth/google?mode=link` → callback links to the
    SESSION user via `POST /auth/google/link`) and Disconnect (`POST /auth/google/unlink`, refused if the
    account has no password - would lock out). Auto-link by verified email now works because accounts have emails.
    New web endpoints: `/api/auth/{email,resend-verification,google/unlink}` (re-set the cookie when the user changes).
  - **Tests:** `src/auth/auth.service.spec.ts` (24, mutation-checked): token single-use, reset revokes
    sessions, Google-link no-hijack, unlink lockout guard, email uniqueness. Reports in `.claude/security-sweep/`,
    `.claude/frontend-review/2026-07-26-auth-suite/`.
- **Prettier gotcha:** the repo's `prettier-plugin-svelte` crashes on Prettier **3.8** (`getVisitorKeys`) -
  format with `npx --yes prettier@3.6.2 --write <specific files>`. **Do NOT `--write "src/**"`** blindly: it
  reformats unrelated files (friends.service, CardComposite, …) and pollutes the diff - pass the files you
  actually changed. `web/pnpm-lock.yaml` is untracked by design - don't commit it.

## Verifying changes

- **API smoke (fast, no browser):** the start endpoints are **authenticated** and always start the match
  for the token owner (a `playerAId` in the body is ignored), and that player must have **no active
  match** (see the one-match rule above) or you get a 409. Easiest is a throwaway account:
  ```bash
  U=smoke$RANDOM
  TOKEN=$(curl -s -XPOST localhost:3056/auth/register -H 'Content-Type: application/json' \
    -d "{\"username\":\"$U\",\"email\":\"$U@example.com\",\"password\":\"TestPass123!\",\"acceptTerms\":true}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
  GID=$(curl -s -XPOST localhost:3056/game/start-duel -H "Authorization: Bearer $TOKEN" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["gameId"])')
  curl -s localhost:3056/game/state/$GID            # inspect duelStage + duelCenter (unauthenticated)
  curl -s -H "Authorization: Bearer $TOKEN" localhost:3056/game/active/current   # the one match, or null
  curl -s -XDELETE localhost:3056/auth/me -H "Authorization: Bearer $TOKEN"      # clean up after
  ```
- **Browser (Playwright is installed, chromium headless):** drive `https://cartomania.bobagi.space` or
  navigate directly to `/game/duel/<id>` (state fetch + duel actions are unauthenticated) and
  screenshot. Import via `createRequire('/opt/cartomania/web/')('playwright')`.

## Conventions & rules

- **Don't reset the database** (default). It's seeded (idempotent) with the Dracomania collection
  (32 cards + their pt/es `CardTranslation` rows) and users `admin` (ADMIN) / `alice`. Adding the
  translations was an additive migration (`20260608000000_add_card_translations`) - `migrate deploy`
  + seed on a normal `docker compose up` applied it with no wipe. Creating throwaway test games/users is fine; they age out (admin
  "Expire old games" button) - but direct DB mutations are restricted, so prefer the app's own endpoints.
- **Secrets:** `.env` (backend) and `web/.env` hold DB creds / API base. Both are git-ignored and
  NOT tracked - never commit them, put them in tracked files, or leak them publicly. **The repo is
  PUBLIC** (`Bobagi/cartomania`): never add ops notes that leak the host/SSH access (two
  `howToAccessDatabase.md` files that exposed `ssh root@bobagi.space` were removed for this reason),
  and keep examples credential-free.
- **Seed passwords are a security-sensitive default.** `prisma/seed.ts` falls back to weak demo
  passwords (`admin123` / `alice123`) when `ADMIN_PASSWORD` / `ALICE_PASSWORD` are unset, and the seed
  `upsert` uses `update:` so it **rotates the password on every `docker compose up`**. For any
  internet-facing deploy these MUST be set in the live `.env` - otherwise the public site has a known
  ADMIN login. To rotate: set them in `.env`, then `docker compose up -d cartomania` (re-runs the seed).
- **Don't touch other VPS services** (rhyme, umami, todo, etc.) - see `/root/CLAUDE.md` for the machine map.
- **Commits:** end messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Work on
  `main` (current convention) or `feat/*`; confirm before destructive git/DB actions.

## Status (update as you go)

- **One active match per player (2026-08-01, owner request).** Before this, a player could stack any
  number of matches (the owner had 2 open duels when the session started, and 20 concurrent start calls
  would have created 20). Now `createGame` refuses a second match for either duellist, atomically
  (transaction + per-player advisory lock), and the start endpoints act on the authenticated user so
  nobody can spend someone else's slot. The dashboard call to action becomes "Resume duel" instead of
  offering a start that would be refused, and the friends panel says whether it is you or the friend who
  is busy. Verified live on the deploy: unauthenticated start 401, second start 409 with the existing
  gameId, **20 concurrent starts -> exactly 1 match**, 10 crossed friend challenges -> exactly 1 match,
  0 deadlocks, and a busy friend's gameId is not leaked to the challenger. Tests: 15 new, all
  mutation-checked (removing the throw, the `winner:null` filter, the playerB side of the `OR`, the
  advisory lock, the bot exemption or the controller's use of the token all go red). Full suite 40/40.
  frontend-review run (`.claude/frontend-review/20260801-one-match/`): 0 P0/P1, 1 P2 found and fixed (the
  dashboard rendered the same match twice, once in the call to action and once in the now-pointless
  "Your active games" list). See the **ONE ACTIVE MATCH PER PLAYER** gotcha.
- **Account admin + Google avatar as a pick (2026-07-26).** Owner requests: (1) **seed only creates
  `admin`** now (removed `alice`), and `admin` gets `email=bobagi.contact@gmail.com` + `emailVerified`
  (`prisma/seed.ts`; the seed no longer needs `ALICE_PASSWORD`). Applied live too: `alice` hard-deleted
  via the app endpoint, `Bobagi` promoted to ADMIN (direct UPDATE). (2) **The Google profile photo is now a
  permanent avatar pick.** New `Player.googleAvatarUrl` (migration `20260726120000`, with a backfill of
  existing Google accounts) is kept separate from `avatarUrl` (the current choice); set on Google
  login/link/refresh, cleared on unlink. `AvatarPicker` shows it as the first option (blue ring + "G"
  badge) so a user who switched to card art can go back to their Google photo. NOTE: the dashboard reads
  the user from the session-cookie snapshot, so `googleAvatarUrl` shows up after a login that included it
  (the real Google login already does).
- **Owner account consolidated + dedicated SMTP app password (2026-07-26).** The first Google login had
  created a separate `Gustavo` account (no email on `Bobagi` to auto-link). Consolidated at the owner's
  request: migrated the Google identity (googleId + `gustavoperin067@gmail.com` + photo) onto **`Bobagi`**
  (now ADMIN, email-verified, password + Google both work) and hard-deleted `Gustavo`. Also: the live
  **SMTP now uses a Gmail app password DEDICATED to Cartomania** (still `bobagi.contact@gmail.com`, no longer
  shared with Porkfolio) in `.env` `SMTP_PASSWORD`. Verified end-to-end: a real reset email was delivered to
  the owner's inbox. **Only `admin` (seed) and `Bobagi` are ADMIN;** the other seed/demo users
  (`admin2`/`bobao`/`Leftninja`) remain USERs, no email.
- **Landing polish + em dash purge (2026-07-26).** Owner feedback pass on the hero: (1) **Copy is now
  truthful** in en/pt/es. It used to say "two dragons" / "hand-painted dragons", but the Dracomania set
  is 32 cards, only 10 of them dragons (rest: warriors, mages, mythic creatures). Verify future copy
  against the real catalog (`curl -s http://localhost:3056/game/cards` or `prisma/seed.ts`). (2) **The em
  dash (U+2014) is BANNED app-wide** and is now a global standing rule (`~/.claude/CLAUDE.md` +
  `Bobagi/claude-skills` `config/CLAUDE.md`): all UI strings reworded, all code comments use a plain
  hyphen. Check: `grep -rnP "\x{2014}" web/src` must be empty. (3) `.button-ghost` (the hero's "See the
  cards") got a dark ~0.62 fill + `backdrop-filter: blur()` so animated art behind it is frosted and the
  label stays readable. (4) The hero `.hero-art-ring` was shrunk + softened and the `.lp-hero` gap grown
  so the spinning rings stay behind the cards instead of bleeding into the copy/buttons; card size, gap
  and promise width re-tuned so the Play CTA still clears the cookie bar above the fold at 1440.

- **Account/email suite - password reset, email verification, Google linking, session revocation
  (2026-07-26, Porkfolio-modelled).** Registration now takes an **email** (unique, verified). Added
  transactional email (`nodemailer`, config-driven; live via the owner's Gmail app password), one-time
  `AuthToken`s (SHA-256-hashed, single-use), **password reset** (`/forgot-password` → `/reset-password`,
  revokes all sessions), **email verification** (`/verify-email` + resend), **Google connect/disconnect**
  on `/account`, and **`tokenVersion`** session revocation (JWT strategy now DB-checks it, killing
  password-change/reset and deleted-user tokens). Ran the full loop: **test-forge** (24 mutation-checked
  auth tests), **security-sweep** (live: session revocation, deleted-user token, email uniqueness, unlink
  lockout, IDOR on link - all pass), **frontend-review** (0 P0/P1, 0 CSP violations). Real email delivery
  proven end-to-end (read the actual verification email via Gmail). See the **Full account/email suite** gotcha.
- **Landing hero reworked (2026-07-25) - merged into `feat/duel-circle-art`, deployed.** The owner
  found the two-column "text left / login right" hero unattractive and wanted the cards (the biggest
  selling point) front and centre. The hero is now a single centred stage: title + promise → big card
  fan as the centrepiece → Play call, all above the fold on a laptop. Login moved out of the hero into
  a quiet bottom `.lp-login` panel (`#login`), reachable via a new ghost **Log in** in the top bar
  (logged-out) and an "Already have an account?" hero link (smooth-scroll, reduced-motion aware).
  See the updated landing gotcha. Verified: no overflow at 390/1440 in en/pt/es, i18n parity, top-bar
  Log in scrolls #login into view, 0 console errors, no new svelte-check errors.
- **Google sign-in turned LIVE (2026-07-25).** Operator created the OAuth Web client in Google Cloud
  Console (project `bobagi-apps-automation`); wired the creds into backend/web `.env`. Fixed the
  runtime-env gap (`web/ecosystem.config.cjs` now loads `web/.env` into the PM2 process - adapter-node
  doesn't read `.env`, PM2 doesn't either). Live-verified: `/auth/providers`→`{google:true}`,
  `/auth/google`→302 consent with our client_id + state cookie, backend does the real code exchange
  (bogus code→401), callback rejects forged `state`. Only the human happy-path login remains. See the
  **Google sign-in** gotcha.
- **Landing page redesign (2026-07-23) - merged to `main`, deployed.** The logged-out home was a
  login screen with a game-themed header: the loudest object was the password field, the duel board
  was never shown, the page ended at the fold, and the consent bar covered the whole login card on
  phones. It is now a real game landing page (see the landing gotcha above) with the CTA hierarchy
  flipped for first-time visitors. Also fixed: hero card names cropped by a fixed overlap, the violet
  off-palette `Create account` button on `/register`, and a 24px tap target. Full `frontend-review`
  run - 2 P1 / 5 P2 / 2 P3 found and fixed, plus 3 layout bugs caught by measurement during the build
  (document-wide horizontal scroll, a 424px ring in a 350px box, the flex `center` overflow trap).
  Report + before/after screenshots: `.claude/frontend-review/2026-07-23-landing/report.md`.

- **Production-readiness / auth+security pass (2026-07-23) - on branch `feat/duel-circle-art`.** Made the
  app safe to expose to clients: **fixed 2 live-exploitable P0s** - a forgeable admin JWT (`dev-secret`
  fallback in the public repo; proven by forging an admin token live) and self-register-as-ADMIN - plus a
  login timing oracle (P1) and missing login lockout (P2). **Implemented Google OAuth** (config-driven off,
  backend owns the code exchange) and **versioned Terms/Privacy server-side acceptance** (append-only table +
  register checkbox + blocking `AgreementGate`). Hardening: security headers, same-origin CSRF guard, 256 kB
  body cap, Swagger off in prod, bcrypt 12, server-side register validation. Full loop run: **security-sweep**
  (2 P0/1 P1/1 P2 found→fixed→re-tested; `.claude/security-sweep/2026-07-23-auth/report.md`), **test-forge**
  (22 mutation-checked auth tests, `npx jest src/auth`; `.claude/test-forge/2026-07-23-auth.md`),
  **frontend-review** (0 P0/P1, fixed the legal "last updated" date mismatch;
  `.claude/frontend-review/2026-07-23-auth/`). See the **Auth hardening**, **Google sign-in**, and
  **Terms/Privacy** gotchas above. Operator TODO to turn Google ON: create the OAuth client + fill the
  `GOOGLE_*` env. (Also committed the pending `docker-compose.yml` db `on-failure`→`unless-stopped` fix.)
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
  (~1.83GB) - `docker volume rm chronos_pgdata && docker image rm chronos-chronos`. A pre-rename SQL
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
  (fire→burn, magic→dissolve, might→crush via `playDuelDestruction`) - it plays on the loser's card OR, in
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
  via the `CardTranslation` table (the duel keeps canonical English by design - see the gotcha).
- **Cookie/analytics consent + privacy accuracy (2026-06-26).** Added a consent banner
  (`CookieBanner.svelte` + `lib/consent/consent.ts`): essential cookies always work; **Umami analytics
  loads only after the visitor accepts** (was hardcoded in `app.html`, loading unconditionally - and the
  privacy policy falsely claimed "no third-party analytics"). The policy's Cookies/Analytics sections were
  corrected in all 3 locales + a footer "Cookie preferences" link re-opens the banner. Verified with
  Playwright (no script pre-consent / injected on Accept-all / never on Essential-only / persists for
  return visitors). a11y: added the site-wide **`.button:focus-visible`** ring (was missing everywhere) +
  focus styles on the new link-buttons. See the **consent-gating gotcha** above.
- **Friends panel z-index fixed**: backdrop z-index raised to 200 (was 40, behind top-bar at 50); dock
  → 210, toast → 220 so they all float above the top bar correctly on desktop and mobile.
- **Card outline**: 8-direction text-shadow using `--cc-outline-size` (em-fraction, default 0.09) and
  `--cc-outline-color` (default `#000`). Both are live CSS vars tunable from `/cards-lab`. Uses
  `calc(var(--cc-outline-size, 0.09) * 1em)` directly (no intermediate `--osh`/`--oc` vars that
  can silently fail in chained calc()). Text color and position baked from user's exported values.
- **`/cards-lab` controls**: non-working sliders (`Attr outline base`, `Attr value/label outline`)
  removed; `Outline color` picker now wired to `--cc-outline-color`; `Outline thickness` slider for
  `--cc-outline-size` (em-fraction 0.02-0.16); `Number size` min lowered to 0.08.
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

- **[MERGED to `main` 2026-08-02 - `feat/duel-circle-art` is history now, work on `main`]
  Duel battlefield rework.** Long iterative session (2026-06-20 → 26). **Current state - commit `f3694e7`:**
  - **Step 1 (merged to `main`):** removed the "your card here" / "waiting" centre placeholders + the slot's
    framed outline (the felt is empty until a card is played); fixed the opponent's face-down card clipping
    (the card-back PNG is narrower than the slot → `object-fit: contain`, not `cover`).
  - **Step 2 (branch):** the centre is `.lb__arena`, a **CIRCULAR** gold-rimmed felt disc split into two
    halves (top = opponent, bottom = you). The played card's **creature ART** (a centred SQUARE,
    `.lb__arena-art`) fills the matching half - yours on pick, the opponent's on REVEAL. The empty space
    around it is filled by **`VoidFlames`** (`web/src/lib/cards/voidFlames.ts`): a `<canvas>` particle effect
    (same family as the destruction FX) - dark "flame tongues" emanate OUTWARD from each card; **each flame's
    colour is sampled from the art's EDGE** (CORS on `bobagi.space/images/` enabled + a `?fx` cache-buster -
    see /opt/CLAUDE.md 2026-06-21); the opponent's flames drift toward you; honours `prefers-reduced-motion`.
    The round-loss `CardDestroyer` FX plays ON the loser's creature art. The power selector + the REVEAL
    clash are in-disc card-style `.lb__orb`s on the **lower circumference** (icon + value reusing
    `.card-attribute-value`; green aura on hover / your chosen power, red for the opponent at REVEAL). The
    per-round win/lose banner is hidden. Decorative rotating rings around the disc. See the **"Duel board
    layout" gotcha** for the full structure + class names.
  - **REJECTED - do NOT re-try (the user disliked each, after seeing them live):** (1) a blurred-art "fog" /
    a darker dissolving "void" for the empty sides; (2) an **edge-feather / radial `mask` on the art** - it
    rounded the corners → "circular art", which the user HATED ("nunca") - keep the field art a CLEAN SQUARE;
    (3) framing the field card with the `/frames/default.png` border + reshaping the arena to a rounded
    SQUARE with square rings ("não ficou bom" - reverted to the circle in `f3694e7`).
  - **Open / next:** keep tuning the flames per taste (intensity / length / darkness / density - the user
    referenced a Hearthstone "black flame"; constant emission from every border point would look best but was
    kept moderate for performance/accessibility); the `is-lose` dark tint still overlays the destruction
    (could drop); the opponent half has no "hidden card" indicator before REVEAL.
  - **Merge history (do not repeat the mistake):** this item used to say "NOT merged, `main` is the
    fallback", and that stale line survived 5 weeks while every session kept committing to the branch
    and deploying it - `main` silently fell 41 commits behind and could no longer run the app. Merged
    into `main` on 2026-08-02 (branch side won every conflict, all of them the duplicated consent-banner
    commit; the resulting tree is byte-identical to what was already live). **There is no long-lived
    feature branch here: finish, merge to `main`, push, deploy.**

1. **[DONE 2026-07-23] `admin`/`alice` passwords + weak-seed hardening.** The live `.env` DOES now set
   `ADMIN_PASSWORD`/`ALICE_PASSWORD` (verified), and `seed.ts` now **refuses to seed with the demo defaults
   when `NODE_ENV=production`**. `NODE_ENV=production` is set in the live `.env`. (The old admin123/alice123
   default is dead on this deploy.) If the operator wants to rotate again: change the values → `docker compose
   up -d cartomania`.
2. **Unauthenticated duel endpoints.** `GET /game/state/:id` and the duel actions (choose card/attribute,
   advance, unchoose) are unauthenticated - anyone with a `gameId` can read/act on a match. Acceptable for
   a portfolio; harden (auth guard + "is this player in this game" check) if it ever matters.
   (Deliberately left: the Playwright/CI verify flows and the pure-renderer client rely on this.) The
   **start** endpoints are NO LONGER in this bucket: they were authenticated on 2026-08-01 because, with
   one match per player, an anonymous caller naming another player's id could lock that player out.
3. **[DONE 2026-07-25] Google sign-in is LIVE.** OAuth client created, creds wired, `/auth/providers`→
   `{google:true}`, live-tested (302 to consent, real code exchange, state CSRF enforced). See the **Google
   sign-in** gotcha (incl. the PM2/ecosystem runtime-env fix). Last check: a human happy-path login.
7. **[DONE 2026-07-26] Password reset + email verification** are live (SMTP configured = owner's Gmail app
   password). See the **Full account/email suite** gotcha. Still open (optional): **login-history /
   new-device alerts** (needs the same email sender + an access-event table - Porkfolio has the pattern).
8. **[optional privacy] Self-host the Google Fonts** (Cinzel/Manrope/Teko) so CSP can drop
   `fonts.googleapis.com`/`fonts.gstatic.com` and visitor IPs stop reaching Google (the card fonts
   Morpheus/Exocet are already self-hosted).
4. **Duel realtime: swap polling for WebSockets** (optional polish). The client polls `GET state` every
   1 s; the `game` WS gateway already emits `state` to room `game:<id>`. Would need an nginx
   `location /socket.io/` → `:3056` and a socket.io-client. Lower priority - polling works fine.
5. **`.nvmrc` says 20 but only Node 18.20.5 is installed** on the VPS; the web build needs
   `npm_config_engine_strict=false`. Either install Node 20 (and drop the flag) or change `.nvmrc` to 18.
6. **Minor cleanup:** `CardComposite` inline-styles the attribute value/label at `5cqh`/`3cqh`, but
   `game/fonts.css` overrides both with `!important` (`--cc-val-size` 8cqh / `--cc-label-size` 5.6cqh) -
   the inline values are dead. Harmless, but worth removing to avoid confusion.
