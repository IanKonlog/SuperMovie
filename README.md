# SuperMovie

Personal, self-hosted movie & TV tracker — the first module of a personal super app. Powered by TMDB.

Single user, Next.js 16 + PostgreSQL + Prisma, deployed on a VPS with Docker Compose behind Caddy.

## Development

Prerequisites: Node 24+, Docker.

```sh
docker start superapp-pg        # local Postgres on localhost:5433
cp .env.example .env            # then adjust values if needed
npm install
npx prisma migrate dev          # apply migrations
npm run dev
```

## Deploy to a VPS via Tailscale (rsync flow)

No third party needed: laptop and VPS talk over the tailnet.

### One-time: VPS setup

```sh
# on the VPS — install Docker + Tailscale, then:
tailscale up                                  # join your tailnet
git clone <repo> superapp 2>/dev/null || true # or let deploy.sh rsync it
cd superapp
cp .env.production.example .env               # fill in secrets (never synced)
docker compose up -d --build                  # app on localhost:3000, migrations run on start
tailscale serve --bg localhost:3000           # HTTPS on your tailnet
```

### One-time: bring your existing data

```sh
# on the Mac (local dev database):
docker exec superapp-pg pg_dump -U postgres superapp > superapp-dump.sql
scp superapp-dump.sql your-vps:~/
```

### Everyday: ship changes

```sh
VPS_USER=me VPS_HOST=your-vps.tailnet.ts.net ./scripts/deploy.sh
```

rsyncs the code (never `.env` or generated code) and rebuilds on the VPS. Migrations run automatically on container start.

### Open it anywhere

Open `https://<machine-name>.<tailnet>.ts.net` from any device on your tailnet.

## Data & backups

- Postgres lives in the `pgdata` Docker volume — survives rebuilds, restarts, and deploys.
- Nightly backup with 7-day rotation (cron on the VPS):

```sh
30 2 * * * /home/YOU/superapp/scripts/backup-db.sh /home/YOU/superapp
```

- Optional off-VPS copy over Tailscale (from the Mac):
  `scp your-vps:~/backups/superapp-$(date +\%Y\%m\%d)*.sql.gz ~/backups/`
- Restore a backup: `gunzip -c dump.sql.gz | docker compose exec -T db psql -U postgres superapp`
## Project layout

- `src/app/` — routing, layouts, login
- `src/modules/<feature>/` — feature code (actions, queries, components)
- `src/lib/` — singletons (db, auth)
- `prisma/` — schema + migrations

See `AGENTS.md` for architecture rules and conventions.
