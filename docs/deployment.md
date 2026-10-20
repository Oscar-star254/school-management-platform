# Deployment

1. Provision a Linux VPS with Docker Engine, Compose, 4 GB RAM, and a domain.
2. Copy `.env.example` to `.env`, replace every secret, and set `POSTGRES_PASSWORD`.
3. Run `docker compose -f infra/docker-compose.yml up -d --build`.
4. Put a TLS-terminating reverse proxy in front of port 8080. Use Certbot with the nginx plugin and enable renewal.
5. Verify `/api/health`, log in with a non-demo administrator, and revoke demonstration credentials.

Run `infra/backup.sh` daily with `DATABASE_URL` and a durable `BACKUP_DIR`. It creates compressed PostgreSQL dumps and removes files older than 14 days. Restore with:

```bash
gzip -dc school-YYYYMMDD-HHMMSS.sql.gz | psql "$DATABASE_URL"
```

Before updates, take a backup. Pull the release, rebuild, apply database migrations, verify health, then remove the prior images. Monitor container health, disk usage, PostgreSQL connections, Redis memory, API p95 latency, queue depth, payment callback failures, and backup age.
