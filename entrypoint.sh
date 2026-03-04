#!/bin/sh

# Replace NEXT_PUBLIC_ placeholders in compiled Next.js JS files (only regular files)
find /app/annix-frontend/.next -type f -name "*.js" -exec sed -i \
  "s|__NEXT_PUBLIC_API_URL__|${NEXT_PUBLIC_API_URL}|g;s|__NEXT_PUBLIC_GOOGLE_MAPS_API_KEY__|${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}|g" \
  {} +

# Start the unified server
cd /app/annix-backend
exec node --max-old-space-size=384 dist/src/main
