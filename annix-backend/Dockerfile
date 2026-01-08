# ---- Builder stage ----
FROM node:24-slim AS builder

WORKDIR /usr/src/app

# Install only prod tools needed for build
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy and build
COPY . .
RUN corepack enable pnpm && pnpm run build

# ---- Runtime stage ----
FROM node:24-slim AS runner

WORKDIR /usr/src/app

# Copy only necessary runtime files
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

# Copy built app from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/config/data-source.ts ./src/config/data-source.ts
COPY --from=builder /usr/src/app/src/migrations ./src/migrations

EXPOSE 4000

CMD ["sh", "-c", "node dist/main"]
