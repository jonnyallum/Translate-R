# Translate-R

**Live video calls with real-time voice translation subtitles — and a language learning twist.**

Two people video call inside the app. Each speaks their own language. Subtitles appear in real-time with a unique dual-mode toggle:

- **Learning mode** — literal, structure-preserving translation so you can see *how* the foreign language is actually formed
- **Natural mode** — polished, idiomatic translation that reads like a native speaker wrote it

Both translations are pre-generated and stored per utterance, so toggling is instant.

## TODO

- [x] Architecture design
- [x] Database schema (Supabase migration)
- [x] Shared TypeScript types
- [x] Backend: TranslationService (GPT-4o-mini, literal + natural)
- [x] Backend: DeepgramSTTService (Nova-3 streaming)
- [x] Backend: SpeechService abstraction (vendor-agnostic)
- [x] Backend: REST API routes (auth, calls, utterances)
- [x] Backend: WebSocket handler (STT proxy + utterance broadcast)
- [x] Mobile: Expo project config (app.config.ts, permissions)
- [x] Mobile: Navigation (Expo Router)
- [x] Mobile: Auth flow (LoginScreen)
- [x] Mobile: HomeScreen (contacts + start call)
- [x] Mobile: CallScreen (WebRTC + subtitles + controls)
- [x] Mobile: SubtitleList (fading, scroll, auto-scroll)
- [x] Mobile: SubtitleLine (learning/natural rendering)
- [x] Mobile: ModeToggle (segmented control)
- [x] Mobile: CallControls (mute, camera, hangup)
- [x] Mobile: CallService (Daily.co abstraction)
- [x] Mobile: SpeechService hook (useSpeechToUtterances)
- [x] Mobile: TranscriptScreen (post-call history)
- [ ] EAS build configuration
- [ ] Push notifications for incoming calls
- [ ] Audio recording + playback (post-MVP)
- [ ] Colour-coded parts of speech (post-MVP)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo + React Native (TypeScript) |
| Navigation | Expo Router |
| State | Zustand + React Query |
| Video | Daily.co (WebRTC) |
| STT | Deepgram Nova-3 Multilingual (streaming) |
| Translation | OpenAI GPT-4o-mini |
| Backend | Next.js (Vercel) |
| Database | Supabase (Postgres + Auth + Realtime) |
| Realtime | Supabase Realtime channels |

## Project Structure

```
translate-r/
├── mobile/                    # Expo app
│   ├── app/                   # Expo Router screens
│   │   ├── _layout.tsx        # Root layout
│   │   ├── index.tsx          # Auth gate
│   │   ├── login.tsx          # Login screen
│   │   ├── home.tsx           # Contacts + start call
│   │   ├── call/[id].tsx      # Call screen
│   │   └── transcript/[id].tsx # Post-call transcript
│   ├── components/
│   │   ├── SubtitleList.tsx
│   │   ├── SubtitleLine.tsx
│   │   ├── CallControls.tsx
│   │   └── ModeToggle.tsx
│   ├── services/
│   │   ├── CallService.ts     # Daily.co abstraction
│   │   └── api.ts             # Backend API client
│   ├── hooks/
│   │   ├── useCall.ts
│   │   ├── useSpeechToUtterances.ts
│   │   └── useUtterances.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── callStore.ts
│   └── types/
│       └── index.ts
├── server/                    # Next.js backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── calls.ts
│   │   │   └── utterances.ts
│   │   ├── services/
│   │   │   ├── TranslationService.ts
│   │   │   ├── DeepgramSTTService.ts
│   │   │   └── SpeechService.ts   # Interface
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── daily.ts
│   │   └── ws/
│   │       └── handler.ts
│   └── supabase/
│       └── migration.sql
└── README.md
```

## Utterance Pipeline

```
Speaker talks
  → Audio captured on device
  → Streamed via WebSocket to backend
  → Backend proxies to Deepgram Nova-3
  → Partial results shown as "typing..." indicator
  → Final transcript received
  → Backend calls GPT-4o-mini with single prompt:
      "Generate both a literal and natural translation"
  → Utterance stored in Supabase
  → Broadcast to both clients via Supabase Realtime
  → Subtitle appears on screen
```

## Quick Start

### Backend
```bash
cd server
cp .env.example .env   # Fill in API keys
npm install
npm run dev
```

### Mobile
```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

### Environment Variables

**Server (.env)**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DEEPGRAM_API_KEY=
OPENAI_API_KEY=
DAILY_API_KEY=
```

**Mobile (.env)**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

## Deployment

### Backend → Vercel
```bash
cd server
vercel deploy --prod
```

### Mobile → EAS
```bash
cd mobile
eas build --platform all
eas submit --platform all
```

## Privacy

- Audio is streamed to Deepgram for STT processing — not stored
- Translated text is stored in Supabase (encrypted at rest)
- No audio files are retained
- API keys are server-side only
