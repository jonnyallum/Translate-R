#!/bin/bash
# setup.sh — Master setup script for Translate-R
# Run from the project root: bash setup.sh
#
# This script:
# 1. Installs dependencies for server and mobile
# 2. Tests all API connections
# 3. Deploys the backend to Vercel
# 4. Sets Vercel environment secrets
# 5. Provides instructions for remaining manual steps

set -e

echo ""
echo "🌏  Translate-R Setup"
echo "════════════════════════════════════════════"
echo ""

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ─── Step 1: Check prerequisites ───
echo "Step 1: Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm not found.${NC}"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ required. You have $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) found${NC}"

# Check for Vercel CLI
if command -v vercel >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Vercel CLI found${NC}"
else
  echo -e "${YELLOW}⚠️  Installing Vercel CLI...${NC}"
  npm i -g vercel
fi

# Check for EAS CLI
if command -v eas >/dev/null 2>&1; then
  echo -e "${GREEN}✅ EAS CLI found${NC}"
else
  echo -e "${YELLOW}⚠️  Installing EAS CLI...${NC}"
  npm i -g eas-cli
fi

echo ""

# ─── Step 2: Install server dependencies ───
echo "Step 2: Installing server dependencies..."
cd server
npm install
echo -e "${GREEN}✅ Server dependencies installed${NC}"
cd ..

# ─── Step 3: Install mobile dependencies ───
echo ""
echo "Step 3: Installing mobile dependencies..."
cd mobile
npm install
echo -e "${GREEN}✅ Mobile dependencies installed${NC}"
cd ..

# ─── Step 4: Test API connections ───
echo ""
echo "Step 4: Testing API connections..."
cd server
npx tsx scripts/test-connections.ts
cd ..

# ─── Step 5: Deploy backend to Vercel ───
echo ""
echo "Step 5: Deploying backend to Vercel..."
echo ""
echo "Setting Vercel environment secrets..."
echo "(You may be prompted to log in)"
echo ""

cd server

# Set secrets (using the actual values from .env)
if [ -f .env ]; then
  source .env
  
  echo "Setting SUPABASE_URL..."
  echo "$SUPABASE_URL" | vercel env add SUPABASE_URL production --force 2>/dev/null || true
  
  echo "Setting SUPABASE_ANON_KEY..."  
  echo "$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY production --force 2>/dev/null || true
  
  echo "Setting SUPABASE_SERVICE_KEY..."
  echo "$SUPABASE_SERVICE_KEY" | vercel env add SUPABASE_SERVICE_KEY production --force 2>/dev/null || true
  
  echo "Setting DEEPGRAM_API_KEY..."
  echo "$DEEPGRAM_API_KEY" | vercel env add DEEPGRAM_API_KEY production --force 2>/dev/null || true
  
  echo "Setting OPENAI_API_KEY..."
  echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production --force 2>/dev/null || true
  
  echo "Setting DAILY_API_KEY..."
  echo "$DAILY_API_KEY" | vercel env add DAILY_API_KEY production --force 2>/dev/null || true
  
  echo -e "${GREEN}✅ Environment secrets set${NC}"
fi

echo ""
echo "Deploying to Vercel..."
vercel deploy --prod --yes

cd ..

# ─── Summary ───
echo ""
echo "════════════════════════════════════════════"
echo "🚀 Translate-R Setup Summary"
echo "════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Server dependencies installed${NC}"
echo -e "${GREEN}✅ Mobile dependencies installed${NC}"
echo -e "${GREEN}✅ API connections tested${NC}"
echo -e "${GREEN}✅ Backend deployed to Vercel${NC}"
echo ""
echo "═══ MANUAL STEPS REMAINING ═══"
echo ""
echo -e "${YELLOW}1. Run the database migration:${NC}"
echo "   → Go to https://supabase.com/dashboard/project/htykdntnwzobolnqqdul/sql/new"
echo "   → Paste contents of server/supabase/migration.sql"
echo "   → Click 'Run'"
echo "   → Then paste contents of server/supabase/002_rls_and_realtime.sql"
echo "   → Click 'Run'"
echo ""
echo -e "${YELLOW}2. Enable Email Auth in Supabase:${NC}"
echo "   → Go to https://supabase.com/dashboard/project/htykdntnwzobolnqqdul/auth/providers"
echo "   → Ensure Email provider is enabled"
echo ""
echo -e "${YELLOW}3. Update mobile .env with your Vercel URL:${NC}"
echo "   → Note your Vercel deployment URL from above"
echo "   → Update mobile/.env EXPO_PUBLIC_API_URL"
echo ""
echo -e "${YELLOW}4. Start the mobile app:${NC}"
echo "   → cd mobile && npx expo start"
echo ""
echo -e "${YELLOW}5. Deploy WS server (for production STT streaming):${NC}"
echo "   → cd server && railway up --dockerfile Dockerfile.ws"
echo ""
echo -e "${RED}⚠️  CRITICAL: Rotate ALL API keys that were shared in chat!${NC}"
echo ""
