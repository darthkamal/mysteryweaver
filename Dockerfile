FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
# pnpm-workspace.yaml carries `allowBuilds` (approves better-sqlite3's native
# build + esbuild/sharp) — must be present so install compiles the SQLite binding.
COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` collects route metadata, which imports lib/db and trips its
# JWT_SECRET startup guard. Provide throwaway values scoped to this single RUN
# (no image ENV layer, nothing baked in) — the real secret is injected at
# runtime. DATABASE_URL points at /tmp so no stray db file lands under /app.
# Invoke next directly: `pnpm build` would trigger pnpm's pre-run deps check,
# which re-runs install and fails on the ignored-builds gate (deps are already
# installed+built from the deps stage, so no install is needed here).
RUN JWT_SECRET=build-time-placeholder DATABASE_URL=file::memory: \
    node_modules/.bin/next build

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

# Create the data dir owned by nextjs BEFORE declaring the volume, so a fresh
# named volume inherits this ownership and the non-root user can write the db.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME ["/app/data"]
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
# Node 22 ships global fetch; /join is a static 200 route
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/join').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
