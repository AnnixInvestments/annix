# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/product-data/package.json ./packages/product-data/
COPY annix-backend/package.json ./annix-backend/
COPY annix-frontend/package.json ./annix-frontend/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ---------- frontend builder ----------
FROM deps AS frontend-builder
ARG NEXT_PUBLIC_API_URL=__NEXT_PUBLIC_API_URL__
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=__NEXT_PUBLIC_GOOGLE_MAPS_API_KEY__
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
COPY packages/product-data/ ./packages/product-data/
COPY annix-frontend/ ./annix-frontend/
WORKDIR /app/annix-frontend
RUN pnpm run build

# ---------- backend builder ----------
FROM deps AS backend-builder
COPY packages/product-data/ ./packages/product-data/
COPY annix-backend/ ./annix-backend/
WORKDIR /app/annix-backend
RUN pnpm run build

# ---------- docs collector ----------
FROM node:24-slim AS docs-collector
WORKDIR /usr/src/repo
COPY . .
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /usr/src/docs && \
  cd /usr/src/repo && \
  git ls-files "*.md" -z | xargs -0 -I{} sh -c 'mkdir -p "/usr/src/docs/$(dirname "$1")"; cp "$1" "/usr/src/docs/$1"' _ {}

# ---------- runner ----------
FROM node:24-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  wget \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/product-data/package.json ./packages/product-data/
COPY annix-backend/package.json ./annix-backend/
COPY annix-frontend/package.json ./annix-frontend/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

ENV NODE_ENV=production

# Backend build output
COPY --from=backend-builder /app/annix-backend/dist ./annix-backend/dist

# Backend migration files (needed for release command)
COPY --from=backend-builder /app/annix-backend/src/config/data-source.ts ./annix-backend/src/config/data-source.ts
COPY --from=backend-builder /app/annix-backend/src/migrations ./annix-backend/src/migrations
COPY --from=backend-builder /app/annix-backend/tsconfig.json ./annix-backend/tsconfig.json

# Frontend build output
COPY --from=frontend-builder /app/annix-frontend/.next ./annix-frontend/.next
COPY --from=frontend-builder /app/annix-frontend/public ./annix-frontend/public
COPY --from=frontend-builder /app/annix-frontend/next.config.ts ./annix-frontend/next.config.ts
COPY --from=frontend-builder /app/annix-frontend/package.json ./annix-frontend/package.json

# Project documentation
COPY --from=docs-collector /usr/src/docs ./annix-backend/project-docs

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4000

CMD ["./entrypoint.sh"]
