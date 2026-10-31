import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events" ADD COLUMN "location" varchar;
    ALTER TABLE "events" ADD COLUMN "poster_url" varchar;
    ALTER TABLE "events" ADD COLUMN "poster_alt" varchar;
    ALTER TABLE "assignments" ADD COLUMN "resources" jsonb DEFAULT '[]'::jsonb NOT NULL;
    ALTER TABLE "assignment_submissions" ADD COLUMN "files" jsonb DEFAULT '[]'::jsonb NOT NULL;
    ALTER TABLE "invoices" ADD COLUMN "carry_forward" numeric DEFAULT 0;
    ALTER TABLE "school_settings" ADD COLUMN "primary_color" varchar DEFAULT '#3478c8';
    ALTER TABLE "school_settings" ADD COLUMN "school_badge_url" varchar;
    ALTER TABLE "school_settings" ADD COLUMN "report_template" varchar DEFAULT 'classic';
    ALTER TABLE "school_settings" ADD COLUMN "invoice_template" varchar DEFAULT 'classic';
    ALTER TABLE "school_settings" ADD COLUMN "invoice_footer" varchar;

    CREATE TABLE "private_files" (
      "id" serial PRIMARY KEY NOT NULL,
      "alt" varchar NOT NULL,
      "assignment_id" integer NOT NULL,
      "student_id" integer,
      "uploaded_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "private_files_id" integer;
    ALTER TABLE "private_files" ADD CONSTRAINT "private_files_assignment_id_assignments_id_fk"
      FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "private_files" ADD CONSTRAINT "private_files_student_id_students_id_fk"
      FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "private_files" ADD CONSTRAINT "private_files_uploaded_by_id_users_id_fk"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "private_files_assignment_idx" ON "private_files" USING btree ("assignment_id");
    CREATE INDEX "private_files_student_idx" ON "private_files" USING btree ("student_id");
    CREATE INDEX "private_files_uploaded_by_idx" ON "private_files" USING btree ("uploaded_by_id");
    CREATE INDEX "private_files_updated_at_idx" ON "private_files" USING btree ("updated_at");
    CREATE INDEX "private_files_created_at_idx" ON "private_files" USING btree ("created_at");
    CREATE UNIQUE INDEX "private_files_filename_idx" ON "private_files" USING btree ("filename");
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_private_files_fk"
      FOREIGN KEY ("private_files_id") REFERENCES "public"."private_files"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_private_files_id_idx"
      ON "payload_locked_documents_rels" USING btree ("private_files_id");

    CREATE TABLE "report_publications" (
      "id" serial PRIMARY KEY NOT NULL,
      "student_id" integer NOT NULL,
      "class_id" integer NOT NULL,
      "term_id" integer NOT NULL,
      "published_by_id" integer,
      "published_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "report_publications_id" integer;
    ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_student_id_students_id_fk"
      FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_class_id_classes_id_fk"
      FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_term_id_terms_id_fk"
      FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_published_by_id_users_id_fk"
      FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE UNIQUE INDEX "report_publications_student_term_idx" ON "report_publications" USING btree ("student_id", "term_id");
    CREATE INDEX "report_publications_class_idx" ON "report_publications" USING btree ("class_id");
    CREATE INDEX "report_publications_term_idx" ON "report_publications" USING btree ("term_id");
    CREATE INDEX "report_publications_published_by_idx" ON "report_publications" USING btree ("published_by_id");
    CREATE INDEX "report_publications_updated_at_idx" ON "report_publications" USING btree ("updated_at");
    CREATE INDEX "report_publications_created_at_idx" ON "report_publications" USING btree ("created_at");
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_report_publications_fk"
      FOREIGN KEY ("report_publications_id") REFERENCES "public"."report_publications"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_report_publications_id_idx"
      ON "payload_locked_documents_rels" USING btree ("report_publications_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_private_files_fk";
    DROP INDEX "payload_locked_documents_rels_private_files_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "private_files_id";
    DROP TABLE "private_files" CASCADE;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_report_publications_fk";
    DROP INDEX "payload_locked_documents_rels_report_publications_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "report_publications_id";
    DROP TABLE "report_publications" CASCADE;
    ALTER TABLE "events" DROP COLUMN "location";
    ALTER TABLE "events" DROP COLUMN "poster_url";
    ALTER TABLE "events" DROP COLUMN "poster_alt";
    ALTER TABLE "assignments" DROP COLUMN "resources";
    ALTER TABLE "assignment_submissions" DROP COLUMN "files";
    ALTER TABLE "invoices" DROP COLUMN "carry_forward";
    ALTER TABLE "school_settings" DROP COLUMN "primary_color";
    ALTER TABLE "school_settings" DROP COLUMN "school_badge_url";
    ALTER TABLE "school_settings" DROP COLUMN "report_template";
    ALTER TABLE "school_settings" DROP COLUMN "invoice_template";
    ALTER TABLE "school_settings" DROP COLUMN "invoice_footer";
  `)
}
