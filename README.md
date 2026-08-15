# Aditi — Bilingual AI Voice Agent for Real Estate

A production-shaped voice agent that answers inbound calls on your business number,
has a natural Hindi/English conversation to understand what property a caller
wants, matches it against your listings, and follows up on WhatsApp with the
shortlist. Includes an admin dashboard for leads, call transcripts, property
management, analytics, and an in-browser test call widget.

```
Caller dials your number
        │
        ▼
   Twilio Voice  ──────────────►  Backend (Express + WebSocket)
        │  (Media Stream,               │
        │   real-time audio)            ├─ Deepgram   → speech-to-text (Hindi+English)
        │                                ├─ Claude     → conversation + property search
        ▼                                ├─ ElevenLabs → text-to-speech (Indian female voice)
   Caller hears Aditi                    └─ SQLite     → properties, leads, calls, transcripts
        │
        ▼
   Twilio WhatsApp  ◄── property shortlist sent after the call
```

## What's included

- **`backend/`** — Node.js/TypeScript service: Twilio Voice webhook + Media
  Streams bridge, Deepgram STT, ElevenLabs TTS, Claude conversation engine with
  tool-use (lead capture, property search, WhatsApp send), REST API, SQLite
  database with 24 sample Indian listings.
- **`frontend/`** — React/TypeScript/Tailwind dashboard: analytics, leads, call
  transcripts, property CRUD, a **Live Test Call** page that lets you talk to
  the agent from your browser mic (no phone number needed), and integration
  status/settings.
- **`docker-compose.yml`** — one-command deploy of both services behind nginx.

## Prerequisites — accounts you'll need

| Service | What it's for | Where to get it |
|---|---|---|
| **Anthropic** | Conversation brain (Claude) | console.anthropic.com → API Keys |
| **Deepgram** | Real-time speech-to-text | console.deepgram.com → API Keys |
| **ElevenLabs** | Text-to-speech (the Indian female voice) | elevenlabs.io → Profile → API Keys |
| **Twilio** | Phone number (Voice) + WhatsApp sending | twilio.com/console |

Approximate ongoing cost is per-minute-of-call-audio (Twilio + Deepgram +
ElevenLabs) plus per-token (Claude) plus per-WhatsApp-message (Twilio/Meta).
Check each vendor's current pricing page before going live — none of it is
free at volume, but all four have pay-as-you-go tiers suitable for a pilot.

## 1. Provisioning each vendor

### Anthropic
1. Create an API key at console.anthropic.com.
2. Put it in `backend/.env` as `ANTHROPIC_API_KEY`.

### Deepgram
1. Create an API key at console.deepgram.com.
2. Put it in `backend/.env` as `DEEPGRAM_API_KEY`.
3. The backend requests Deepgram's `nova-2` model with `language: "multi"` for
   Hindi/English code-switching. If your account doesn't have access to that
   model/language combo, check Deepgram's docs for the current recommended
   model for Hindi+English and update `backend/src/services/stt/deepgram.ts`.

### ElevenLabs — picking the Indian female voice
1. Go to **Voice Library** in your ElevenLabs dashboard and filter by
   language/accent for an Indian-accented or Hindi-native female voice (or
   clone/design one under Voice Design if you want a specific sound).
2. Copy that voice's **Voice ID** into `backend/.env` as `ELEVENLABS_VOICE_ID`.
3. Put your API key in `ELEVENLABS_API_KEY`.
4. `ELEVENLABS_MODEL_ID` defaults to `eleven_flash_v2_5` (low latency,
   multilingual). `eleven_multilingual_v2` is a higher-quality, higher-latency
   alternative if call latency isn't a concern.
5. Listen to a few candidate voices in the ElevenLabs playground speaking a
   Hindi/English mixed sentence before committing — accent quality varies a
   lot voice-to-voice.

### Twilio — phone number + WhatsApp
1. Buy a phone number under **Phone Numbers → Buy a number**. Indian local
   numbers have restrictions on Twilio for some use cases — a number that
   supports inbound Voice is what you need; toll-free or a supported Indian
   long-code both work if Voice is enabled. Check current availability for
   India in the Twilio console.
2. Under that number's **Voice Configuration**:
   - "A call comes in" → Webhook → `https://<your-domain>/voice/incoming` (HTTP POST)
   - "Call status changes" → `https://<your-domain>/voice/status` (HTTP POST)
3. Put the number in `backend/.env` as `TWILIO_VOICE_NUMBER` (E.164, e.g. `+91...`).
4. For WhatsApp: start with the **Twilio WhatsApp Sandbox** (free, instant) for
   testing — `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886` is the sandbox
   number, and each tester must send the sandbox join code once from their
   phone. For production, apply for a **WhatsApp Business API sender** through
   Twilio (requires Meta Business verification) and use that number instead.
5. `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` are on your Twilio console home page.

> **⚠️ WhatsApp compliance — read before going live.** WhatsApp only allows
> free-form business-initiated messages within a 24-hour window since the
> customer's last WhatsApp message to you. A caller who has only *phoned* your
> number has not opened that window. To send the property shortlist reliably
> in production, get a **WhatsApp Message Template** approved in Twilio/Meta
> Business Manager for this use case, and switch
> `backend/src/services/whatsapp/twilioWhatsapp.ts` from a free-form `body` to
> `contentSid` + `contentVariables` referencing that approved template. The
> sandbox and any tester who has messaged your number directly will work
> without this, which is why it's easy to miss during testing.

## 2. Local development

Requires Node.js 20+.

```bash
# Backend
cd backend
cp .env.example .env        # fill in your API keys
npm install
npm run seed                # loads 24 sample Indian listings into SQLite
npm run dev                 # http://localhost:8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open the dashboard at `http://localhost:5173` → **Live Test Call** to talk to
the agent from your browser mic immediately — this exercises the exact same
Claude/Deepgram/ElevenLabs pipeline as a real phone call, so it's a genuine
end-to-end test without needing Twilio set up yet.

To expose your local backend to Twilio for a real phone test before deploying,
tunnel it (e.g. `ngrok http 8080`) and set `PUBLIC_BASE_URL` in `.env` to the
`https://` tunnel URL, then point the Twilio number's webhooks at it.

## 3. Deploying with Docker

```bash
cp backend/.env.example backend/.env   # fill in your real keys
docker compose up -d --build
```

This builds and runs:
- `backend` on port 8080 (SQLite persisted in a named volume, survives restarts/redeploys)
- `frontend` on port 80 (nginx, proxies `/api` and `/test-widget` to the backend container)

Put this behind a reverse proxy/load balancer with a real TLS certificate
(Caddy, nginx + certbot, Cloudflare, or your cloud provider's managed
ingress) — Twilio requires **HTTPS/WSS** for the webhook and Media Stream
URLs. Set `PUBLIC_BASE_URL` in `backend/.env` to that public `https://` domain
before pointing Twilio at it.

## 4. Customizing

- **Connect your real property listings**: replace the SQLite-backed queries
  in `backend/src/db/repository.ts` (`properties.search`) and
  `backend/src/services/propertyMatcher.ts` with calls to your website's
  property API/database. Everything upstream (the Claude tool, the dashboard)
  reads through that one layer, so this is the only place that needs to change.
- **Conversation behavior / questions asked / tone**: edit the system prompt
  in `backend/src/conversation/prompts.ts`.
- **Voice**: swap `ELEVENLABS_VOICE_ID` / `ELEVENLABS_MODEL_ID` in `.env`.
- **Add authentication to the dashboard** before exposing it publicly — it
  currently has none, and it shows caller phone numbers and transcripts.

## 5. Production hardening notes (before real traffic)

- **Dashboard auth**: add login (the API/dashboard currently trust anyone who
  can reach them).
- **Database**: SQLite is fine for a single instance and moderate call volume;
  move `backend/src/db` to Postgres if you need multiple backend replicas or
  high concurrency.
- **Consent & compliance**: recording and transcribing calls, and matching
  personal data (name, phone, budget) against a database, are regulated in
  India under the DPDP Act — get legal sign-off on your consent language
  (e.g. an opening disclosure that the call may be recorded/processed by AI)
  and your WhatsApp opt-in flow before launch. Voice calls to numbers on
  India's DND registry also have restrictions if you ever originate outbound
  calls — this project is inbound-only (caller-initiated), which is the safer
  posture.
- **Twilio signature validation** is already enforced in production
  (`backend/src/services/telephony/twilio.ts`) so only genuine Twilio requests
  can trigger call handling — don't disable it.
- **Rate limiting / abuse protection** on the public webhook endpoints isn't
  included — add it if the number is publicly known.

## Repo layout

```
backend/
  src/
    server.ts                 Express + WebSocket server entrypoint
    conversation/              Claude system prompt, tool-use loop, per-call session state
    services/
      llm/                     Claude client + tool definitions
      stt/                     Deepgram real-time streaming client
      tts/                     ElevenLabs streaming synthesis
      telephony/               Twilio TwiML + webhook signature validation
      whatsapp/                Twilio WhatsApp send
      propertyMatcher.ts       Search + progressive relaxation + voice/WhatsApp formatting
    websocket/
      mediaStream.ts           Twilio Media Streams bridge (real phone calls)
      testWidget.ts            Browser mic bridge (Live Test Call page)
    db/                        SQLite schema, repository, seed data
    routes/                    REST API + Twilio webhooks
frontend/
  src/
    pages/                     Overview, Leads, Calls, Properties, Live Test, Settings
    components/                Shared UI, layout, property form
    lib/                       API client, types, formatting
docker-compose.yml
```
