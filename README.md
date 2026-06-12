# Echobit 🎙️

AI-powered voice recording and transcription SaaS — record meetings, get automatic transcription (15+ Indian languages), AI summaries, meeting minutes, and action items.

**v2 runs entirely on the Cloudflare stack**: one Worker serves the web app and the API, with D1, R2, Queues, Workers AI, and Email Service behind it.

## Monorepo layout (Bun workspaces)

```
apps/web/          Vue 3 SPA (Vite + Tailwind 4) — built into apps/web/dist
apps/api/          Hono Worker: /api/* + SPA static assets, queue consumer
packages/shared/   Plan limits, pricing constants, id generation
scripts/migrate/   MongoDB → D1 migration + API contract test suite
mobile-app/        Ionic/Capacitor Android app (published — frozen API contract)
backend/           Legacy Express backend (kept until cutover, then deleted)
```

## Stack

| Concern | Technology |
|---|---|
| Web + API hosting | Cloudflare Workers (static assets + Hono) |
| Database | Cloudflare D1 (SQLite) |
| Audio storage | Cloudflare R2 (+ multipart chunk assembly) |
| Transcription | Workers AI Whisper large-v3-turbo · Sarvam AI (Indian languages) |
| Summaries/minutes | Gemini 2.5 Flash (fallback: Workers AI Llama 3.3) |
| Async jobs | Cloudflare Queues (+ dead-letter queue) |
| Email (OTP etc.) | Cloudflare Email Service |
| Payments | Razorpay (REST + WebCrypto HMAC) |
| Tooling | Bun, wrangler, Vite |

## Development

```bash
bun install

# Terminal 1 — API (local D1/R2; copy apps/api/.dev.vars.example → .dev.vars)
bun run --cwd apps/api db:migrate:local
bun run dev:api          # http://localhost:8787

# Terminal 2 — Web ( /api proxied to :8787 )
bun run dev:web          # http://localhost:5173

bun test                 # unit tests
bun run typecheck        # API typecheck
```

## Deployment

```bash
bun run deploy           # vite build + wrangler deploy
```

One-time setup: create the D1 database + queues, onboard `echobits.xyz` to Email Service, set secrets (`wrangler secret put JWT_SECRET SARVAM_API_KEY GEMINI_API_KEY RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET GOOGLE_CLIENT_ID R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY`), add an R2 lifecycle rule deleting the `uploads/` prefix after 1 day, and attach the custom domains (`echobits.xyz`, plus `recapi.badhusha.dev` for the published mobile app).

Optional — AI Gateway: create a gateway named `echobit` (dashboard → AI > AI Gateway) and set the `AI_GATEWAY_URL` + `AI_GATEWAY_ID` vars in `apps/api/wrangler.jsonc`. Gemini and Workers AI (Whisper + Llama fallback) calls then route through the gateway, giving per-request logs, real token/cost analytics, and spend limits in the gateway dashboard. Sarvam is not a supported gateway provider and always goes direct. With the vars unset, all AI calls go straight to the providers (no gateway needed for local dev).

## Data migration (Mongo → D1)

```bash
cd scripts/migrate
MONGODB_URI=... bun run export-mongo.ts        # → dump/*.ndjson
bun run transform.ts                            # → dump/sql/*.sql (≤90KB statements)
for f in dump/sql/*.sql; do (cd ../../apps/api && bunx wrangler d1 execute echobit --remote --file=../../scripts/migrate/$f); done
bun run verify.ts                               # row counts + sums vs the dump
```

Compatibility proof before cutover: run the contract suite against the old and new backends with identical fixtures —

```bash
OLD_BASE=https://recapi.badhusha.dev/api NEW_BASE=https://staging.../api \
TEST_EMAIL=... TEST_PASSWORD=... bun test scripts/migrate/contract.test.ts
```

## License

MIT
