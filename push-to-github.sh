#!/bin/bash
# push-to-github.sh — Initialize and push to GitHub
# Run from the project root: bash push-to-github.sh

set -e

echo "🚀 Pushing Translate-R to GitHub..."

# Initialize git if not already
if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

# Add remote if not set
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/jonnyallum/Translate-R.git

# Stage everything (respects .gitignore)
git add -A

# Commit
git commit -m "feat: complete Translate-R codebase

- Expo + React Native mobile app with Expo Router
- Next.js backend API (Vercel)
- Standalone WebSocket server for Deepgram STT streaming
- Supabase schema with RLS + Realtime
- Daily.co WebRTC video calls
- GPT-4o-mini dual translation (literal + natural)
- SubtitleList with fading + auto-scroll
- Learning/Natural mode toggle
- Post-call transcript history
- Full deployment config (Vercel, Railway, EAS)"

# Push
git push -u origin main --force

echo ""
echo "✅ Pushed to https://github.com/jonnyallum/Translate-R"
echo ""
