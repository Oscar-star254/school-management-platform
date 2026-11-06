import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_backup_jobs_operation" AS ENUM('backup', 'restore');
    CREATE TYPE "public"."enum_backup_jobs_trigger" AS ENUM('daily', 'manual', 'restore');
    CREATE TYPE "public"."enum_backup_jobs_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'expired');
    CREATE TABLE "backup_jobs" (
      "id" serial PRIMARY KEY NOT NULL,
      "schedule_key" varchar NOT NULL,
      "operation" "enum_backup_jobs_operation" NOT NULL,
      "trigger" "enum_backup_jobs_trigger" NOT NULL,
      "status" "enum_backup_jobs_status" DEFAULT 'queued' NOT NULL,
      "scheduled_date" varchar,
      "file_name" varchar,
      "object_key" varchar,
      "size_bytes" numeric,
      "sha256" varchar,
      "error" varchar,
      "started_at" timestamp(3) with time zone,
      "finished_at" timestamp(3) with time zone,
      "requested_by_id" integer,
      "source_backup_id" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "backup_jobs_id" integer;
    ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_requested_by_id_users_id_fk"
      FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_backup_jobs_fk"
      FOREIGN KEY ("backup_jobs_id") REFERENCES "public"."backup_jobs"("id") ON DELETE cascade ON UPDATE no action;
    CREATE UNIQUE INDEX "backup_jobs_schedule_key_idx" ON "backup_jobs" USING btree ("schedule_key");
    CREATE INDEX "backup_jobs_operation_idx" ON "backup_jobs" USING btree ("operation");
    CREATE INDEX "backup_jobs_trigger_idx" ON "backup_jobs" USING btree ("trigger");
    CREATE INDEX "backup_jobs_status_idx" ON "backup_jobs" USING btree ("status");
    CREATE INDEX "backup_jobs_scheduled_date_idx" ON "backup_jobs" USING btree ("scheduled_date");
    CREATE INDEX "backup_jobs_requested_by_idx" ON "backup_jobs" USING btree ("requested_by_id");
    CREATE INDEX "backup_jobs_source_backup_idx" ON "backup_jobs" USING btree ("source_backup_id");
    CREATE INDEX "backup_jobs_updated_at_idx" ON "backup_jobs" USING btree ("updated_at");
    CREATE INDEX "backup_jobs_created_at_idx" ON "backup_jobs" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_backup_jobs_id_idx"
      ON "payload_locked_documents_rels" USING btree ("backup_jobs_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_backup_jobs_fk";
    ALTER TABLE "backup_jobs" DROP CONSTRAINT "backup_jobs_requested_by_id_users_id_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "backup_jobs_id";
    DROP TABLE "backup_jobs";
    DROP TYPE "public"."enum_backup_jobs_operation";
    DROP TYPE "public"."enum_backup_jobs_trigger";
    DROP TYPE "public"."enum_backup_jobs_status";
  `)
}
