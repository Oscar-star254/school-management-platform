import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_attendance_status" AS ENUM('present', 'absent', 'late', 'excused');
  CREATE TYPE "public"."enum_assessments_status" AS ENUM('open', 'submitted', 'approved', 'published');
  CREATE TABLE "attendance" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_id" integer NOT NULL,
  	"class_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"status" "enum_attendance_status" DEFAULT 'present' NOT NULL,
  	"note" varchar,
  	"marked_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assessments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"term_id" integer NOT NULL,
  	"class_id" integer NOT NULL,
  	"subject_id" integer NOT NULL,
  	"max_marks" numeric DEFAULT 100 NOT NULL,
  	"status" "enum_assessments_status" DEFAULT 'open' NOT NULL,
  	"rejection_note" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "marks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assessment_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"score" numeric,
  	"comment" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "attendance_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assessments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "marks_id" integer;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_id_users_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessments" ADD CONSTRAINT "assessments_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "marks" ADD CONSTRAINT "marks_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "marks" ADD CONSTRAINT "marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "attendance_student_idx" ON "attendance" USING btree ("student_id");
  CREATE INDEX "attendance_class_idx" ON "attendance" USING btree ("class_id");
  CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("date");
  CREATE INDEX "attendance_marked_by_idx" ON "attendance" USING btree ("marked_by_id");
  CREATE INDEX "attendance_updated_at_idx" ON "attendance" USING btree ("updated_at");
  CREATE INDEX "attendance_created_at_idx" ON "attendance" USING btree ("created_at");
  CREATE INDEX "assessments_term_idx" ON "assessments" USING btree ("term_id");
  CREATE INDEX "assessments_class_idx" ON "assessments" USING btree ("class_id");
  CREATE INDEX "assessments_subject_idx" ON "assessments" USING btree ("subject_id");
  CREATE INDEX "assessments_status_idx" ON "assessments" USING btree ("status");
  CREATE INDEX "assessments_updated_at_idx" ON "assessments" USING btree ("updated_at");
  CREATE INDEX "assessments_created_at_idx" ON "assessments" USING btree ("created_at");
  CREATE INDEX "marks_assessment_idx" ON "marks" USING btree ("assessment_id");
  CREATE INDEX "marks_student_idx" ON "marks" USING btree ("student_id");
  CREATE INDEX "marks_updated_at_idx" ON "marks" USING btree ("updated_at");
  CREATE INDEX "marks_created_at_idx" ON "marks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assessments_fk" FOREIGN KEY ("assessments_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_marks_fk" FOREIGN KEY ("marks_id") REFERENCES "public"."marks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_attendance_id_idx" ON "payload_locked_documents_rels" USING btree ("attendance_id");
  CREATE INDEX "payload_locked_documents_rels_assessments_id_idx" ON "payload_locked_documents_rels" USING btree ("assessments_id");
  CREATE INDEX "payload_locked_documents_rels_marks_id_idx" ON "payload_locked_documents_rels" USING btree ("marks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "attendance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assessments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "marks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "attendance" CASCADE;
  DROP TABLE "assessments" CASCADE;
  DROP TABLE "marks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_attendance_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assessments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_marks_fk";
  
  DROP INDEX "payload_locked_documents_rels_attendance_id_idx";
  DROP INDEX "payload_locked_documents_rels_assessments_id_idx";
  DROP INDEX "payload_locked_documents_rels_marks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "attendance_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assessments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "marks_id";
  DROP TYPE "public"."enum_attendance_status";
  DROP TYPE "public"."enum_assessments_status";`)
}
