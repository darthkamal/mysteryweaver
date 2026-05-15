FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output (includes server.js + bundled node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets served by server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Drizzle migrations — read at runtime by lib/db/index.ts on startup
COPY --from=builder --chown=nextjs:nodejs /app/lib/db/migrations ./lib/db/migrations
# Files needed by scripts/seed-gm.ts (run via tsx after deployment)
COPY --from=builder --chown=nextjs:nodejs /app/lib/db/schema.ts ./lib/db/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# Full node_modules (overwrites standalone's trimmed copy; adds tsx + all prod deps)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

VOLUME ["/app/data"]
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
