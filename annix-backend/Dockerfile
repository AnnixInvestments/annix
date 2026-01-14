# ---- Builder stage ----
FROM node:24-slim AS builder

WORKDIR /usr/src/app

# Install all dependencies for build
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install

# Copy and build
COPY . .
RUN corepack enable pnpm && pnpm run build

# ---- Runtime stage ----
FROM node:24-slim AS runner

WORKDIR /usr/src/app

# Copy package files and install production deps + ts-node for migrations
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --prod && pnpm add -D ts-node typescript

# Copy built app from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/config/data-source.ts ./src/config/data-source.ts
COPY --from=builder /usr/src/app/src/migrations ./src/migrations
COPY --from=builder /usr/src/app/tsconfig.json ./tsconfig.json

EXPOSE 4000

CMD ["sh", "-c", "node dist/src/main"]
