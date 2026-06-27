# Echobit Meeting Bot (VM deployment)

The Google Meet recording bot. It joins a Meet with headful Chromium (Playwright),
isolates each call's audio into its own PulseAudio sink, records it to a 16 kHz mono
WAV with ffmpeg, and exposes a small control API. It runs **many meetings at once**
in a single process (`MAX_SESSIONS`).

It used to run as a Cloudflare Container; it now runs **dockerized on a VM** and is
reached by the `MeetingBot` Durable Object (`apps/api/src/meet/bot-do.ts`) over a
**Cloudflare Tunnel**, authenticated with a shared bearer token. The Worker drives it:

```
POST /join    { id, meetingUrl, botName, maxDurationSecs, storageState }  → 202
GET  /status?id=                                            → { state, durationSecs, error }
GET  /audio?id=                                             → WAV stream
POST /stop?id=                                              → end + reap the session
```

`state`: `joining → waiting → recording → done` (or `error`). Every request must carry
`Authorization: Bearer <MEET_BOT_SECRET>`.

## Prerequisites

- A VM with a public-egress network (no inbound ports needed — the tunnel dials out).
  Oracle's free **Ampere A1 (4 OCPU / 24 GB, arm64)** comfortably runs ~6 concurrent.
- Docker + the Compose plugin.
- A Cloudflare account with the zone for your bot hostname (e.g. `echobits.xyz`).

## 1. Google bot account session (optional but recommended)

Without it the bot joins as a guest and can't enter meetings that require sign-in.
Google blocks automated logins, so export cookies from a real browser once:

1. In normal Chrome, sign in to the **dedicated bot** Google account.
2. With the "Cookie-Editor" extension on google.com: Export → JSON → save as `cookies.json` here.
3. `node cookies-to-session.mjs cookies.json` → writes `google-session.json`.
4. Upload it to R2 (the DO reads it from there and passes it into `/join`):
   ```
   wrangler r2 object put echobit/meet-bot/google-session.json --file google-session.json --remote
   ```

The session lives in R2, **not on the VM** — nothing secret beyond `.env` sits on the box.

## 2. Cloudflare Tunnel

In the Zero Trust dashboard → **Networks → Tunnels**:

1. Create a tunnel (e.g. `echobit-meetbot`), choose **Docker** — copy the token (`TUNNEL_TOKEN`).
2. Add a **public hostname**: e.g. `meetbot.echobits.xyz` → service `HTTP` → `http://meetbot:8080`
   (`meetbot` is the compose service name; cloudflared resolves it on the compose network).

No firewall changes — the tunnel is outbound-only.

## 3. Configure & run

```
cp .env.example .env      # set MEET_BOT_SECRET (openssl rand -hex 32), MAX_SESSIONS, TUNNEL_TOKEN
docker compose up -d --build
docker compose logs -f meetbot
```

## 4. Point the Worker at the bot

In `apps/api`:

```
# wrangler.jsonc already sets MEET_BOT_URL (the tunnel hostname) as a var.
wrangler secret put MEET_BOT_SECRET   # paste the SAME value as the VM's .env
wrangler deploy
```

Verify the path end-to-end:

```
# from anywhere, with the bearer — should return JSON; without it, 401
curl -H "Authorization: Bearer $MEET_BOT_SECRET" https://meetbot.echobits.xyz/status?id=test
```

Then schedule a bot from the app and watch `meeting_bots.status` walk
`joining → waiting → recording → uploading → processing`.

## Sizing & ops

- **Per meeting:** ~0.5–1 vCPU under load + ~0.7–1.2 GB RAM (Chromium); ffmpeg is light.
  Set `MAX_SESSIONS` to what the VM sustains; `/join` past the cap returns 503 and the
  Worker's DO retries with backoff.
- **Audio isolation** is the thing to watch: each Chromium is pinned to its own sink via
  `PULSE_SINK`, and `start.sh` disables PulseAudio's stream-restore device memory so a
  second browser can't drift onto the first session's sink. If two meetings ever bleed
  into one recording, that's the first place to look.
- **Logs:** `docker compose logs -f meetbot` (lines are tagged with the session id).
- **Update:** `git pull && docker compose up -d --build`.
- **Restart caveat:** sessions are in-memory; restarting the bot mid-call loses in-flight
  recordings. The DO sees `state: error` ("bot restarted?") on its next poll and fails
  those meetings cleanly. Drain by waiting for active calls to end before restarting.
