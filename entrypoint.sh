#!/bin/sh

# Replace NEXT_PUBLIC_ placeholders in compiled Next.js JS files
find /app/annix-frontend/.next -name "*.js" -exec sed -i \
  "s|__NEXT_PUBLIC_API_URL__|${NEXT_PUBLIC_API_URL}|g;s|__NEXT_PUBLIC_GOOGLE_MAPS_API_KEY__|${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}|g" \
  {} +

# Start the unified server
cd /app/annix-backend
exec node dist/src/main
