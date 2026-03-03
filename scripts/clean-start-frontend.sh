#!/bin/bash
# Bash script for clean frontend start (Git Bash / WSL)
# Usage: ./scripts/clean-start-frontend.sh

echo "=== Clean Frontend Start ==="

# Step 1: Kill processes on port 3000
echo "Killing processes on port 3000..."
if command -v npx &> /dev/null; then
    npx kill-port 3000 2>/dev/null || true
elif command -v lsof &> /dev/null; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi
sleep 2

# Step 2: Clear corrupted cache
echo "Clearing Next.js cache..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../annix-frontend"

rm -rf "$FRONTEND_DIR/.next/cache/turbopack" 2>/dev/null && echo "  Cleared turbopack cache"
rm -rf "$FRONTEND_DIR/.next/cache/swc" 2>/dev/null && echo "  Cleared swc cache"

# Step 3: Start frontend
echo "Starting frontend on port 3000..."
cd "$FRONTEND_DIR"
pnpm dev
