#!/bin/bash
# ============================================
# ColdCraft Reply Engine — Setup Script
# ============================================
# Run this after filling in your .env.local file
# Usage: bash scripts/setup.sh

set -e

echo ""
echo "  ColdCraft Reply Engine — Setup"
echo "  ================================"
echo ""

# Check .env.local exists
if [ ! -f .env.local ]; then
  echo "  ERROR: .env.local not found. Copy .env.example to .env.local and fill in your keys."
  exit 1
fi

# Load env vars
set -a
source .env.local
set +a

# Validate required keys
MISSING=""
[ -z "$SUPABASE_URL" ] && MISSING="$MISSING SUPABASE_URL"
[ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && MISSING="$MISSING SUPABASE_SERVICE_ROLE_KEY"
[ -z "$ANTHROPIC_API_KEY" ] && MISSING="$MISSING ANTHROPIC_API_KEY"
[ -z "$OPENAI_API_KEY" ] && MISSING="$MISSING OPENAI_API_KEY"
[ -z "$INSTANTLY_API_KEY" ] && MISSING="$MISSING INSTANTLY_API_KEY"

if [ -n "$MISSING" ]; then
  echo "  Missing required env vars:$MISSING"
  echo "  Please fill them in .env.local and run again."
  exit 1
fi

echo "  ✓ All required env vars present"
echo ""

# Seed knowledge base
echo "  Seeding knowledge base..."
npx tsx scripts/seed-knowledge.ts

echo ""
echo "  ✓ Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Run the Supabase schema SQL (src/lib/supabase/schema.sql) in your Supabase SQL Editor"
echo "    2. Run 'npm run dev' to start the dev server"
echo "    3. Visit /dashboard to see the reply engine"
echo "    4. Set your Instantly webhook to: https://your-domain.com/api/webhooks/instantly"
echo "    5. Deploy with 'vercel' when ready"
echo ""
