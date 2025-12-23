#!/bin/bash
# Kill all Annix development processes

echo "🛑 Stopping Annix development servers..."

# Kill backend processes
pkill -f "nest start" 2>/dev/null
pkill -f "annix-backend/dist/main" 2>/dev/null
pkill -f "annix-backend.*node" 2>/dev/null

# Kill frontend processes
pkill -f "next dev" 2>/dev/null
pkill -f "annix-frontend.*node" 2>/dev/null

# Kill any processes on the app ports
lsof -ti:4001 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:4200 2>/dev/null | xargs kill -9 2>/dev/null

echo "✅ All development processes stopped"
echo ""
echo "Tip: You can restart with ./run-dev.sh"
