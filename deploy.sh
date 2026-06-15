#!/usr/bin/env bash
# Deploy helper for Chronos / Cartomania (https://cartomania.bobagi.space).
# Frontend = PM2 app `chronos-web` (port 3055); backend = docker compose service `chronos` (port 3056).
#
# Usage:
#   ./deploy.sh           # frontend (default): pnpm build + pm2 restart — for changes in web/
#   ./deploy.sh back      # backend: docker compose build/up chronos + health — for src/ or prisma/
#   ./deploy.sh all       # both
set -euo pipefail
cd "$(dirname "$0")"

step() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

deploy_front() {
  step "Building frontend (web/) + restarting PM2"
  ( cd web && bash -lc 'source ~/.nvm/nvm.sh; export npm_config_engine_strict=false; pnpm run build' ) || die "web build failed"
  pm2 restart chronos-web --update-env && pm2 save
  ok "frontend live (pm2 chronos-web :3055)"
}

deploy_back() {
  step "Building + recreating backend container"
  docker compose build chronos || die "backend build failed"
  docker compose up -d chronos || die "backend up failed"
  step "Health check (http://localhost:3056/health)"
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3056/health || echo 000)
  [ "$code" = "200" ] && ok "backend /health → 200" || printf '\033[1;31m✗ backend /health → %s\033[0m\n' "$code"
}

case "${1:-front}" in
  front|web) deploy_front ;;
  back|api)  deploy_back ;;
  all)       deploy_front; deploy_back ;;
  *) die "unknown target '${1}' (use: front back all)" ;;
esac

printf '\n\033[1;32m✓ Deploy done.\033[0m\n'
