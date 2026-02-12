# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_PUBLIC_API_URL=/api

# ---------- deps ----------
FROM base AS deps
# node-gyp toolchain + libusb + udev headers + glibc compat
RUN apk add --no-cache \
  python3 make g++ linux-headers pkgconf \
  libusb-dev eudev-dev libc6-compat
ENV npm_config_python=/usr/bin/python3
ENV NEXT_PUBLIC_API_URL=/api
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; fi

# ---------- builder ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
ENV NEXT_PUBLIC_API_URL=/api
COPY . .
# ENV NEXT_TELEMETRY_DISABLED=1
RUN if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; fi

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

ENV NEXT_PUBLIC_API_URL=/api

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
