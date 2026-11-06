# External PostgreSQL backup worker

This worker runs outside Vercel. It polls the Payload API for queued backup and restore jobs, runs PostgreSQL tools on the worker host, encrypts custom-format archives with age, and stores the ciphertext in a private Cloudflare R2 bucket. No database or R2 credential is sent to the browser or used by a Vercel request handler.

## What is backed up

Each `pg_dump --format=custom` runs against the complete PostgreSQL database configured by `BACKUP_DATABASE_URL`. It covers all schemas, tables, and school records in that database, not just one school's records. PostgreSQL roles and external object storage/media files are not included. Keep a separate backup for any media bucket if media recovery is required.

The worker validates the local archive with `pg_restore --list`, encrypts it with age, uploads without a public ACL, downloads it again, decrypts it, checks the plaintext SHA-256, and validates the restored archive listing. Logs in the admin panel record timestamps, status, uploaded file size, checksum, and sanitized worker errors. Failed jobs notify the configured HTTPS Slack-compatible webhook; configure and test that webhook before relying on alerts.

## Configure the worker host

Requirements: Docker Compose, network access to the Payload API and PostgreSQL, and a private R2 bucket. Run one worker replica; it claims and processes jobs sequentially. Set up a dedicated R2 access key restricted to this bucket.

1. Generate a worker token and age key pair on a trusted host:

   ```sh
   openssl rand -hex 32
   age-keygen -o backup-age-identity.txt
   ```

   Store the private identity in `infra/backup-worker/secrets/backup-age-identity.txt` on the worker host. Keep it out of Git and grant read access only to the worker's container user (UID 10001). Put only the public `age1...` recipient into `BACKUP_AGE_RECIPIENT`.

2. Copy `.env.example` to `.env` in this directory and set:
   - `BACKUP_API_URL` to the actual Payload API origin ending in `/api`, not the frontend URL.
   - `BACKUP_WORKER_TOKEN` to the same random token in the Payload deployment environment.
   - `BACKUP_DATABASE_URL` to a TLS-enabled PostgreSQL URL for the full application database.
   - The Cloudflare R2 account ID, bucket name, and bucket-scoped access key.
   - The age public recipient, alert webhook, and timezone (`Africa/Nairobi` is EAT).
   - `BACKUP_TMPFS_SIZE` large enough for temporary copies during backup and verification (allow roughly three times the uncompressed database size).
   - Configure `BACKUP_RESTORE_ROLE` as the application database owner role. The worker's database account must be permitted to `SET ROLE` to it during restore.
   - Keep `BACKUP_RESTORE_ENABLED=false` until restoration has been tested and the worker's database role and operational recovery procedure are approved.

   `.env` and `secrets/` are excluded from source control. Use the host's secret manager instead of a committed or shared environment file for production credentials.

3. Configure the Payload server (for example, in the Payload deployment's server-side environment):
   - `BACKUP_WORKER_TOKEN`: exactly the same random worker token.
   - `BACKUP_RESTORE_ENABLED=false` initially.

   Do not add these to any `VITE_*` setting or frontend environment. The worker token must have at least 32 characters.

4. Apply the Payload migration before enabling the worker:

   ```sh
   pnpm --dir payload run payload migrate
   ```

5. Start and inspect the external worker:

   ```sh
   docker compose -f infra/backup-worker/docker-compose.yml up -d --build
   docker compose -f infra/backup-worker/docker-compose.yml logs -f
   ```

The worker enqueues one idempotent daily job at 2:00 AM in `BACKUP_TIMEZONE` (default `Africa/Nairobi`). The latest 30 successful daily backups are retained; expired R2 objects are deleted before their log entries are marked expired. Manual backups are kept separately and do not consume the daily retention count. If deletion fails, the worker leaves that backup record intact and emits an alert.

## Database permissions

The worker must be able to read all application tables and sequences for `pg_dump`. To enable the optional database swap restore, its PostgreSQL role also needs permission to create the staging database, restore all objects/schemas, terminate application connections, and rename the configured database. These are powerful privileges. Use a dedicated role, TLS, network allowlists, and a separate worker host; do not reuse an application-facing frontend credential.

Restoration creates and fully restores a staging database first. Only after the archive has passed integrity checks does it terminate existing connections and rename the current database aside, then rename the restored database into place. It keeps the previous database as `school_before_restore_<job id>` for rollback; it is not automatically deleted. After checking application health and data, an authorized database operator can remove that old database according to the host's retention policy.

## Secure restore procedure

1. Keep `BACKUP_RESTORE_ENABLED=false` until permissions, monitoring, and an incident window are prepared. Restoration causes application downtime while connections are terminated and the database is renamed.
2. Enable `BACKUP_RESTORE_ENABLED=true` only in both the Payload server environment and worker `.env`, then restart/redeploy each. The frontend displays restore controls only to a Super Admin. The API independently enforces that role and requires the exact `RESTORE <backup filename>` phrase.
3. Verify the selected backup is a successful, retained job. Submit the restore from the admin Backups page. The request only queues a job; the external worker performs all database operations.
4. Monitor the job log, worker log, notification channel, and application health. Keep the prior database until the restored application is validated. Disable restore again after the recovery window.

Restoration is deliberately opt-in. The worker must not be scaled to multiple replicas, and the R2 bucket and age identity must be included in the organization's separate disaster-recovery access controls. Test restores against a non-production database before relying on production recovery.
