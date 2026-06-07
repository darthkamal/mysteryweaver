# Deployment Guide — Coolify

MysteryWeaver deploys as a single Docker container. The database is a SQLite file persisted in a named volume. No external services required.

---

## Prerequisites

- A Coolify instance (self-hosted or cloud)
- The GitHub repo connected to Coolify
- Docker Compose support enabled in Coolify (enabled by default)

---

## Step 1 — Connect the repository

1. In Coolify → **New Resource** → **Docker Compose**
2. Select your GitHub repository: `darthkamal/mysteryweaver`
3. Coolify detects `docker-compose.yml` at the repo root automatically

---

## Step 2 — Set environment variables

In the Coolify environment variables panel, add:

| Variable | Value | Notes |
|---|---|---|
| `JWT_SECRET` | `<generated>` | Run `openssl rand -hex 32` to generate |

Generate a secure secret:

```bash
openssl rand -hex 32
```

`DATABASE_URL` is already set in `docker-compose.yml` to `file:/app/data/mysteryweaver.db` — do not override this unless you know what you're doing.

---

## Step 3 — Deploy

Click **Deploy** in Coolify. The build process:

1. `deps` stage — installs all packages via `pnpm install --frozen-lockfile`
2. `builder` stage — runs `pnpm build` (Next.js standalone output)
3. `runner` stage — assembles the minimal runtime image

First deploy takes 3–5 minutes. Subsequent deploys are faster (Docker layer cache).

The app starts and runs Drizzle migrations automatically before accepting requests.

---

## Step 4 — Create the first GM account

After the first deploy, go to **Execute Command** in Coolify and run:

```bash
node_modules/.bin/tsx scripts/seed-gm.ts --email=gm@example.com --password=yourpassword --name="Game Master"
```

Expected output:
```
✓ GM created: gm@example.com (id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

You can create additional GM accounts by running this command again with different credentials.

---

## Step 5 — Configure a domain (optional)

In Coolify, assign a custom domain or use the auto-generated Coolify domain. Coolify handles TLS automatically via Let's Encrypt.

---

## Ongoing operations

### Redeploy after a code push

Coolify can auto-deploy on push to `main`. Or trigger a manual deploy from the Coolify UI. Drizzle migrations run automatically on each start.

### Database backup

The SQLite database lives in the `sqlite_data` Docker volume at `/app/data/mysteryweaver.db`. To back it up:

```bash
# From the Coolify server
docker run --rm \
  -v <volume-name>:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysteryweaver-backup-$(date +%Y%m%d).tar.gz /data
```

Replace `<volume-name>` with the actual volume name (visible in `docker volume ls`).

### View logs

```bash
docker compose logs -f app
```

Or use the Coolify logs panel.

### Check running containers

```bash
docker compose ps
```

---

## Architecture at a glance

```
Internet → Coolify reverse proxy (TLS) → app:3000
                                              │
                                         SQLite DB
                                    /app/data/mysteryweaver.db
                                         (named volume)
```

One container. One process. One file. That's it.

---

## Scaling

SQLite is single-writer. This design runs one container — horizontal scaling is not supported. For a typical mystery game session (6–8 concurrent players + 1 GM), a small VPS (2 vCPU, 1 GB RAM) is more than sufficient.

If you outgrow this, the migration path is to replace the SQLite + SSE layer with PostgreSQL + Redis pub/sub, keeping all game logic functions unchanged.

---

## docker-compose.yml reference

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - sqlite_data:/app/data
    environment:
      DATABASE_URL: file:/app/data/mysteryweaver.db
      JWT_SECRET: ${JWT_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/join').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

volumes:
  sqlite_data:
```

`restart: unless-stopped` ensures the container restarts automatically after a crash or server reboot, but stays stopped if you manually stop it via Coolify. The `healthcheck` lets Coolify track readiness and surface an unhealthy container.
