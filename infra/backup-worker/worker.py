import hashlib
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from zoneinfo import ZoneInfo

import boto3
import requests
from botocore.config import Config


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("backup-worker")

POLL_SECONDS = int(os.getenv("BACKUP_POLL_SECONDS", "15"))
BACKUP_TIMEZONE = ZoneInfo(os.getenv("BACKUP_TIMEZONE", "Africa/Nairobi"))
AGE_IDENTITY = Path(os.environ["BACKUP_AGE_IDENTITY_FILE"])
AGE_RECIPIENT = os.environ["BACKUP_AGE_RECIPIENT"]
DATABASE_URL = os.environ["BACKUP_DATABASE_URL"]
API_URL = os.environ["BACKUP_API_URL"].rstrip("/")
WORKER_TOKEN = os.environ["BACKUP_WORKER_TOKEN"]
BUCKET = os.environ["R2_BUCKET_NAME"]
ALERT_WEBHOOK = os.getenv("BACKUP_ALERT_WEBHOOK_URL", "")
RESTORE_ROLE = os.getenv("BACKUP_RESTORE_ROLE", "")
SAFE_TOOL_ENV = {
    key: os.environ[key]
    for key in ("PATH", "HOME", "SSL_CERT_FILE", "SSL_CERT_DIR")
    if key in os.environ
}

if len(WORKER_TOKEN) < 32:
    raise RuntimeError("BACKUP_WORKER_TOKEN must contain at least 32 characters.")
if not AGE_IDENTITY.is_file():
    raise RuntimeError("The configured age identity file is not mounted.")
if not re.fullmatch(r"age1[0-9a-z]+", AGE_RECIPIENT):
    raise RuntimeError("BACKUP_AGE_RECIPIENT is not a valid age recipient.")
if not shutil.which("pg_dump") or not shutil.which("pg_restore") or not shutil.which("age"):
    raise RuntimeError("pg_dump, pg_restore, and age must be installed in the worker image.")


def build_pg_environment(database: str | None = None) -> tuple[dict[str, str], str]:
    parsed = urlparse(DATABASE_URL)
    if parsed.scheme not in ("postgres", "postgresql") or not parsed.hostname:
        raise RuntimeError("BACKUP_DATABASE_URL must be a PostgreSQL connection URL.")

    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", ["prefer"])[0]
    if sslmode not in ("require", "verify-ca", "verify-full"):
        raise RuntimeError("BACKUP_DATABASE_URL must require PostgreSQL TLS.")
    environment = {
        **SAFE_TOOL_ENV,
        "PGHOST": parsed.hostname,
        "PGPORT": str(parsed.port or 5432),
        "PGUSER": unquote(parsed.username or ""),
        "PGPASSWORD": unquote(parsed.password or ""),
        "PGDATABASE": database or unquote(parsed.path.lstrip("/")),
        "PGSSLMODE": sslmode,
    }
    for query_key, env_key in (
        ("sslrootcert", "PGSSLROOTCERT"),
        ("sslcert", "PGSSLCERT"),
        ("sslkey", "PGSSLKEY"),
        ("application_name", "PGAPPNAME"),
    ):
        if query_key in query:
            environment[env_key] = query[query_key][0]

    database_name = unquote(parsed.path.lstrip("/"))
    if not re.fullmatch(r"[A-Za-z0-9_]+", database_name) or database_name == "postgres":
        raise RuntimeError("The database name must be a safe identifier and cannot be postgres.")
    return environment, database_name


PG_ENVIRONMENT, DATABASE_NAME = build_pg_environment()

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
    config=Config(retries={"max_attempts": 5, "mode": "standard"}),
)

session = requests.Session()
session.headers.update(
    {
        "Authorization": f"Bearer {WORKER_TOKEN}",
        "Content-Type": "application/json",
    }
)


def api(method: str, path: str, **kwargs):
    response = session.request(
        method,
        f"{API_URL}{path}",
        timeout=(10, 60),
        **kwargs,
    )
    response.raise_for_status()
    return response.json()


def notify(event: str, details: str) -> None:
    try:
        response = requests.post(
            ALERT_WEBHOOK,
            json={"text": f"Smartschool backup {event}: {details}"},
            timeout=(5, 15),
        )
        response.raise_for_status()
    except requests.RequestException:
        logger.exception("Could not deliver the configured backup alert.")


def run_command(args: list[str], *, env: dict[str, str] | None = None) -> None:
    try:
        subprocess.run(
            args,
            check=True,
            env=env or PG_ENVIRONMENT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=24 * 60 * 60,
        )
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "no command output").strip()[-1000:]
        detail = re.sub(r"(?i)(password|pwd)=\S+", r"\1=[redacted]", detail)
        raise RuntimeError(f"{Path(args[0]).name} failed: {detail}") from error


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_database_archive(job_id: int, temp_dir: Path) -> tuple[str, str, int, str]:
    dump_path = temp_dir / f"smartschool-{job_id}.dump"
    encrypted_path = temp_dir / f"smartschool-{job_id}.dump.age"
    run_command(
        [
            "pg_dump",
            "--format=custom",
            "--no-owner",
            "--no-acl",
            "--file",
            str(dump_path),
        ]
    )
    if dump_path.stat().st_size == 0:
        raise RuntimeError("pg_dump produced an empty archive.")

    run_command(["pg_restore", "--list", str(dump_path)], env=SAFE_TOOL_ENV)
    plaintext_sha = sha256_file(dump_path)
    run_command(
        [
            "age",
            "--encrypt",
            "--recipient",
            AGE_RECIPIENT,
            "--output",
            str(encrypted_path),
            str(dump_path),
        ],
        env=SAFE_TOOL_ENV,
    )

    uploaded_size = encrypted_path.stat().st_size
    return str(dump_path), str(encrypted_path), uploaded_size, plaintext_sha


def verify_uploaded_backup(object_key: str, expected_sha: str, temp_dir: Path) -> None:
    downloaded = temp_dir / "verify.dump.age"
    decrypted = temp_dir / "verify.dump"
    s3.download_file(BUCKET, object_key, str(downloaded))
    run_command(
        [
            "age",
            "--decrypt",
            "--identity",
            str(AGE_IDENTITY),
            "--output",
            str(decrypted),
            str(downloaded),
        ],
        env=SAFE_TOOL_ENV,
    )
    if sha256_file(decrypted) != expected_sha:
        raise RuntimeError("Downloaded backup failed its SHA-256 integrity check.")
    run_command(["pg_restore", "--list", str(decrypted)], env=SAFE_TOOL_ENV)


def create_backup(job: dict) -> None:
    with tempfile.TemporaryDirectory(prefix="smartschool-backup-") as directory:
        temp_dir = Path(directory)
        _, encrypted_path, encrypted_size, plaintext_sha = prepare_database_archive(
            int(job["id"]), temp_dir
        )
        now = datetime.now(timezone.utc)
        trigger = job["trigger"]
        stamp = now.strftime("%Y%m%dT%H%M%SZ")
        filename = f"smartschool-{trigger}-{stamp}-{job['id']}.dump.age"
        prefix = "daily" if trigger == "daily" else "manual"
        object_key = f"{prefix}/{now:%Y/%m/%d}/{filename}"

        s3.upload_file(
            encrypted_path,
            BUCKET,
            object_key,
            ExtraArgs={
                "ContentType": "application/octet-stream",
                "Metadata": {"sha256": plaintext_sha, "encryption": "age"},
            },
        )
        verify_uploaded_backup(object_key, plaintext_sha, temp_dir)
        api(
            "POST",
            "/backup-worker/complete",
            json={
                "id": job["id"],
                "operation": "backup",
                "fileName": filename,
                "objectKey": object_key,
                "sizeBytes": encrypted_size,
                "sha256": plaintext_sha,
            },
        )
        logger.info("Verified backup uploaded: job=%s key=%s", job["id"], object_key)


def restore_database(job: dict) -> None:
    if os.getenv("BACKUP_RESTORE_ENABLED") != "true":
        raise RuntimeError("Restoration is disabled on this worker.")
    source = job.get("sourceBackup")
    if isinstance(source, dict):
        source_id = source.get("id")
        object_key = source.get("objectKey")
        expected_sha = source.get("sha256")
        filename = source.get("fileName")
    elif source:
        source_id = source
        metadata = api("GET", f"/backup-worker/backup?id={source_id}")
        object_key = metadata.get("objectKey")
        expected_sha = metadata.get("sha256")
        filename = metadata.get("fileName")
    else:
        raise RuntimeError("The restore request has no source backup.")
    if not object_key or not expected_sha or not filename:
        raise RuntimeError("The selected source backup is missing its verified storage metadata.")

    with tempfile.TemporaryDirectory(prefix="smartschool-restore-") as directory:
        temp_dir = Path(directory)
        encrypted = temp_dir / "restore.dump.age"
        archive = temp_dir / "restore.dump"
        s3.download_file(BUCKET, object_key, str(encrypted))
        run_command(
            [
                "age",
                "--decrypt",
                "--identity",
                str(AGE_IDENTITY),
                "--output",
                str(archive),
                str(encrypted),
            ],
            env=SAFE_TOOL_ENV,
        )
        if sha256_file(archive) != expected_sha:
            raise RuntimeError("The selected backup failed its SHA-256 integrity check.")
        run_command(["pg_restore", "--list", str(archive)], env=SAFE_TOOL_ENV)

        stage_name = f"school_restore_{job['id']}"
        old_name = f"school_before_restore_{job['id']}"
        if len(stage_name) > 63 or len(old_name) > 63:
            raise RuntimeError("The restore job id is too long for a PostgreSQL database name.")

        maintenance_env, _ = build_pg_environment("postgres")
        run_command(
            ["createdb", "--template=template0", "--owner", RESTORE_ROLE, stage_name],
            env=maintenance_env,
        )
        try:
            run_command(
                [
                    "pg_restore",
                    "--no-owner",
                    "--no-acl",
                    "--exit-on-error",
                    "--role",
                    RESTORE_ROLE,
                    "--dbname",
                    stage_name,
                    str(archive),
                ],
                env={**PG_ENVIRONMENT, "PGDATABASE": stage_name},
            )
            run_command(
                [
                    "psql",
                    "--set",
                    "ON_ERROR_STOP=1",
                    "--dbname",
                    "postgres",
                    "--command",
                    (
                        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                        f"WHERE datname = '{DATABASE_NAME}' AND pid <> pg_backend_pid()"
                    ),
                ],
                env=maintenance_env,
            )
            run_command(
                [
                    "psql",
                    "--set",
                    "ON_ERROR_STOP=1",
                    "--dbname",
                    "postgres",
                    "--command",
                    f'ALTER DATABASE "{DATABASE_NAME}" RENAME TO "{old_name}"',
                ],
                env=maintenance_env,
            )
            try:
                run_command(
                    [
                        "psql",
                        "--set",
                        "ON_ERROR_STOP=1",
                        "--dbname",
                        "postgres",
                        "--command",
                        f'ALTER DATABASE "{stage_name}" RENAME TO "{DATABASE_NAME}"',
                    ],
                    env=maintenance_env,
                )
            except Exception:
                run_command(
                    [
                        "psql",
                        "--set",
                        "ON_ERROR_STOP=1",
                        "--dbname",
                        "postgres",
                        "--command",
                        f'ALTER DATABASE "{old_name}" RENAME TO "{DATABASE_NAME}"',
                    ],
                    env=maintenance_env,
                )
                raise
        except Exception:
            logger.exception("Database restore failed; the prior database is retained.")
            raise

    notify(
        "restore completed",
        f"job {job['id']} restored backup {filename}. The previous database is retained as {old_name}.",
    )
    logger.warning(
        "Database restored from backup job=%s source=%s; previous database retained=%s",
        job["id"],
        source_id,
        old_name,
    )


def apply_retention() -> None:
    try:
        response = api("GET", "/backup-worker/retention")
        backups = response.get("backups", [])
        expired = backups[30:]
        removed_ids: list[int] = []
        for backup in expired:
            object_key = backup.get("objectKey")
            try:
                if object_key:
                    s3.delete_object(Bucket=BUCKET, Key=object_key)
                removed_ids.append(int(backup["id"]))
            except Exception:
                logger.exception("Could not remove expired backup object id=%s", backup.get("id"))
                notify(
                    "retention failure",
                    f"Could not remove expired backup record {backup.get('id')}.",
                )
        if removed_ids:
            api("POST", "/backup-worker/expire", json={"ids": removed_ids})
            logger.info("Expired %s old daily backup(s).", len(removed_ids))
    except Exception as error:
        logger.exception("Daily backup succeeded, but retention cleanup did not complete.")
        notify("retention failure", f"Cleanup could not complete: {type(error).__name__}: {error}")


def handle_job(job: dict) -> None:
    try:
        if job.get("operation") == "backup":
            create_backup(job)
            if job.get("trigger") == "daily":
                apply_retention()
        elif job.get("operation") == "restore":
            restore_database(job)
            api(
                "POST",
                "/backup-worker/complete",
                json={"id": job["id"], "operation": "restore"},
            )
        else:
            raise RuntimeError("The queued backup operation is not supported.")
    except Exception as error:
        summary = f"{type(error).__name__}: {error}"[:1800]
        logger.exception("Backup operation failed: job=%s", job.get("id"))
        try:
            api("POST", "/backup-worker/fail", json={"id": job["id"], "error": summary})
        except Exception:
            logger.exception("Could not report failed job status to the Payload API.")
        notify("operation failed", f"job {job.get('id')}: {summary}")


def enqueue_daily_job() -> None:
    now = datetime.now(BACKUP_TIMEZONE)
    scheduled_date = now.date() if (now.hour, now.minute) >= (2, 0) else (now.date() - timedelta(days=1))
    api(
        "POST",
        "/backup-worker/schedule",
        json={"scheduledDate": scheduled_date.isoformat()},
    )


def validate_configuration() -> None:
    required = (
        "BACKUP_API_URL",
        "BACKUP_DATABASE_URL",
        "BACKUP_WORKER_TOKEN",
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "BACKUP_AGE_RECIPIENT",
        "BACKUP_ALERT_WEBHOOK_URL",
    )
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(f"Missing required worker configuration: {', '.join(missing)}")
    api_url = urlparse(API_URL)
    if api_url.scheme != "https" or api_url.username or api_url.password:
        raise RuntimeError("BACKUP_API_URL must be an HTTPS URL without embedded credentials.")
    if ALERT_WEBHOOK and urlparse(ALERT_WEBHOOK).scheme != "https":
        raise RuntimeError("BACKUP_ALERT_WEBHOOK_URL must use HTTPS.")
    if POLL_SECONDS < 1:
        raise RuntimeError("BACKUP_POLL_SECONDS must be at least one second.")
    if os.getenv("BACKUP_RESTORE_ENABLED") == "true" and not RESTORE_ROLE:
        raise RuntimeError("BACKUP_RESTORE_ROLE is required when database restoration is enabled.")


def main() -> None:
    validate_configuration()
    logger.info("Backup worker started; daily schedule timezone=%s", BACKUP_TIMEZONE)
    while True:
        try:
            enqueue_daily_job()
            job = api("POST", "/backup-worker/next").get("job")
            if job:
                handle_job(job)
            else:
                time.sleep(POLL_SECONDS)
        except Exception:
            logger.exception("Backup worker loop error.")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
