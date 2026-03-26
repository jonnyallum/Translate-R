# Translate-R Deployment Guide

## Overview

Translate-R requires three deployed services:

| Service | Platform | Purpose |
|---------|----------|---------|
| REST API | Vercel | Next.js API routes for calls, utterances, auth |
| WebSocket Server | Railway/Render | Streaming STT proxy (Deepgram) |
| Database | Supabase | Postgres + Auth + Realtime subscriptions |

Plus the mobile app built via EAS for iOS and Android.

---

## Step 1: Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:
   ```
   Copy contents of server/supabase/migration.sql
   Paste into SQL Editor → Run
   ```
3. Go to **Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`
4. Go to **Authentication → Providers** and enable Email/Password
5. Go to **Database → Replication** and ensure `utterances` and `calls` tables are in the `supabase_realtime` publication

---

## Step 2: External Service Keys

### Deepgram
1. Sign up at [console.deepgram.com](https://console.deepgram.com)
2. Create an API key with `usage:write` scope
3. Save as `DEEPGRAM_API_KEY`

### OpenAI
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a key
3. Save as `OPENAI_API_KEY`

### Daily.co
1. Sign up at [dashboard.daily.co](https://dashboard.daily.co)
2. Go to **Developers → API Keys**
3. Copy your API key → `DAILY_API_KEY`

---

## Step 3: Deploy REST API to Vercel

```bash
cd server

# Install Vercel CLI
npm i -g vercel

# Login and link
vercel login
vercel link

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add SUPABASE_ANON_KEY
vercel env add DEEPGRAM_API_KEY
vercel env add OPENAI_API_KEY
vercel env add DAILY_API_KEY

# Deploy
vercel deploy --prod
```

Note the deployment URL (e.g. `https://translate-r-api.vercel.app`).

---

## Step 4: Deploy WebSocket Server to Railway

```bash
cd server

# Using Railway CLI
npm i -g @railway/cli
railway login
railway init

# Set environment variables
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_KEY=...
railway variables set DEEPGRAM_API_KEY=...
railway variables set OPENAI_API_KEY=...
railway variables set WS_PORT=3001

# Deploy using Dockerfile
railway up --dockerfile Dockerfile.ws
```

Alternative: Deploy to **Render**
1. Create a new Web Service
2. Point to the `server/` directory
3. Set Dockerfile path to `Dockerfile.ws`
4. Add all environment variables
5. Set port to 3001

Note the WebSocket URL (e.g. `wss://translate-r-ws.up.railway.app`).

---

## Step 5: Build Mobile App with EAS

```bash
cd mobile

# Install EAS CLI
npm i -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Update environment variables in eas.json
# Replace placeholder values with your actual URLs and keys

# Build for development (test on your device)
eas build --platform all --profile development

# Build for production (store submission)
eas build --platform all --profile production
```

### iOS Specific
1. You need an Apple Developer account ($99/year)
2. EAS handles provisioning profiles automatically
3. Submit to TestFlight:
   ```bash
   eas submit --platform ios
   ```

### Android Specific
1. EAS generates the signing key automatically
2. Submit to Google Play internal testing:
   ```bash
   eas submit --platform android
   ```

---

## Step 6: Test the Full Pipeline

1. Sign up two test accounts in the app
2. User A (English speaker) → User B (Thai speaker)
3. User A starts a call with User B
4. Both join → Daily.co video connects
5. User A speaks English:
   - Audio → STT (Deepgram) → Text
   - Text → Translation (GPT-4o-mini) → literal + natural
   - Stored in Supabase → Realtime broadcast
   - Both users see subtitles
6. Toggle between Learning and Natural modes
7. End call → View transcript history

---

## Cost Estimates (MVP)

| Service | Free Tier | Paid Usage |
|---------|-----------|------------|
| Supabase | 500MB DB, 2GB bandwidth | From $25/mo |
| Deepgram | $200 credit | ~$0.0059/min |
| OpenAI (GPT-4o-mini) | — | ~$0.15/1M input tokens |
| Daily.co | 100 participant-mins/day | From $0.04/min |
| Vercel | Hobby (free) | From $20/mo |
| Railway | $5 credit/mo | From $5/mo |
| EAS Build | 30 builds/mo free | From $99/mo |

**Estimated cost for 100 hours of calls/month**: ~$50-80

---

## Architecture Notes

### Why a separate WebSocket server?
Vercel's serverless functions have a 30-second timeout and don't support persistent WebSocket connections. Streaming audio for STT requires a long-lived connection, so we run a standalone Node.js WebSocket server on Railway/Render.

### Why Supabase Realtime instead of our own WebSocket for subtitles?
Supabase Realtime listens for Postgres INSERT events and broadcasts them to subscribed clients. This means:
- We don't need to manage our own pub/sub infrastructure
- Both clients automatically get new utterances when they're inserted
- It works even if the utterance was created by the REST API (not just the WS path)
- Built-in connection management and retry logic

### Why GPT-4o-mini instead of DeepL + LLM?
- Single API call produces both literal and natural translations
- Better instruction-following for the "literal/learning" format
- Cheaper than chaining two services
- The `TranslationService` interface is pluggable — swap to DeepL + Claude later if needed

### Audio privacy
- Audio streams to our WebSocket server → proxied to Deepgram → discarded
- No audio files are stored anywhere
- Only text transcripts and translations are persisted
- All data encrypted at rest in Supabase
