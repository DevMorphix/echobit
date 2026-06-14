#!/usr/bin/env bash
# Merge the two frontend builds into one assets dir for the echobit Worker.
#   - Astro promo (apps/promo/dist) → repo-root/dist  (marketing at /, /pricing, …)
#   - Vue app (apps/web/dist)       → /assets/* + /app-shell.html (the SPA shell)
# Astro uses /_astro/ and Vue uses /assets/, so they don't collide. Vue's
# index.html is renamed to app-shell.html so it doesn't clobber the marketing
# home; the Worker serves it for app routes (see apps/api/src/index.ts).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

cp -R "$ROOT/apps/promo/dist/." "$DIST/"
cp -R "$ROOT/apps/web/dist/assets" "$DIST/assets"
cp "$ROOT/apps/web/dist/index.html" "$DIST/app-shell.html"

echo "Merged assets → $DIST"
