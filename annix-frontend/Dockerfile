# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://annix-backend.fly.dev
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

# ---------- deps ----------
FROM base AS deps
# node-gyp toolchain + libusb + udev headers + glibc compat
RUN apk add --no-cache \
  python3 make g++ linux-headers pkgconf \
  libusb-dev eudev-dev libc6-compat
ENV npm_config_python=/usr/bin/python3
COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN corepack enable pnpm && pnpm install

# ---------- builder ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm run build

# ---------- runner ----------
FROM base AS runner
# runtime libs for usb addon
RUN apk add --no-cache libusb eudev-libs libc6-compat

ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
USER nextjs

WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
