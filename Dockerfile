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

# Prisma 7 reads prisma.config.ts at boot, which imports dotenv/config and
# prisma/config. Next.js standalone tracing doesn't pick these up because
# nothing in the app bundle imports them — they're only used by the
# `prisma migrate deploy` step in CMD. Copy them explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
# Transitive: @prisma/config (bundled inside prisma) requires `effect` at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/effect ./node_modules/effect
# npm bin shims. The Prisma 7 CLI loads prisma_schema_build_bg.wasm
# relative to its own location, so we need the whole .bin directory
# (and the wasm sibling files), not just the prisma entry point.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

USER nextjs
EXPOSE 3000

# Run pending migrations on boot, then start. Invoke prisma via node
# directly (not npx) so __dirname resolves inside node_modules/prisma/build,
# where the CLI's wasm files actually live. Railway's auto-deploy handles
# both web service and DB linkage; DATABASE_URL must be set in env.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
