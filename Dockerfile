# syntax=docker/dockerfile:1.7

# ─── Stage 1: dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --no-audit --no-fund

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client (custom output: src/generated/prisma)
RUN npx prisma generate

# Build (Sentry source-map upload only runs when SENTRY_AUTH_TOKEN is set)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for runtime
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output bundles only what's needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma client + schema for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Prisma 7 reads prisma.config.ts at boot, which transitively pulls in
# @prisma/config + effect + fast-check + ... Next.js standalone tracing
# skips this whole subtree because no app code imports it (it's only
# used by `prisma migrate deploy` in CMD). Hand-picking subdirs always
# misses some transitive dep, so install them fresh — npm resolves the
# full tree in one shot.
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
RUN npm install --no-save --no-audit --no-fund --omit=dev --legacy-peer-deps \
      prisma@^7.8.0 dotenv@^17.4.2 \
 && chown -R nextjs:nodejs /app/node_modules

USER nextjs
EXPOSE 3000

# Run pending migrations on boot, then start. Invoke prisma via node
# directly (not npx) so __dirname resolves inside node_modules/prisma/build,
# where the CLI's wasm files actually live. Railway's auto-deploy handles
# both web service and DB linkage; DATABASE_URL must be set in env.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
