# ---- Builder stage ----
FROM node:24-slim AS builder

WORKDIR /usr/src/app

# Install only prod tools needed for build
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy and build
COPY . .
RUN yarn build

# ---- Runtime stage ----
FROM node:24-slim AS runner

WORKDIR /usr/src/app

# Copy only necessary runtime files
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built app from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/config/data-source.ts ./src/config/data-source.ts
COPY --from=builder /usr/src/app/src/migrations ./src/migrations

EXPOSE 4000

CMD ["sh", "-c", "node dist/main"]
