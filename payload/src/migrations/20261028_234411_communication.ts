import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_notices_audience" AS ENUM('all', 'role', 'class');
  CREATE TYPE "public"."enum_notices_audience_role" AS ENUM('staff', 'teachers', 'parents', 'students');
  CREATE TYPE "public"."enum_notices_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_events_type" AS ENUM('event', 'exam', 'holiday', 'deadline');
  CREATE TYPE "public"."enum_timetable_slots_day_of_week" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri');
  CREATE TYPE "public"."enum_assignments_status" AS ENUM('draft', 'published', 'archived');
  CREATE TABLE "notices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"audience" "enum_notices_audience" DEFAULT 'all' NOT NULL,
  	"audience_role" "enum_notices_audience_role",
  	"audience_class_id" integer,
  	"status" "enum_notices_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"published_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notice_reads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"notice_id" integer NOT NULL,
  	"user_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"type" "enum_events_type" DEFAULT 'event' NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone,
  	"class_id" integer,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "timetable_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"class_id" integer NOT NULL,
  	"subject_id" integer NOT NULL,
  	"teacher_id" integer NOT NULL,
  	"day_of_week" "enum_timetable_slots_day_of_week" NOT NULL,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL,
  	"room" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"instructions" varchar,
  	"class_id" integer NOT NULL,
  	"subject_id" integer NOT NULL,
  	"due_date" timestamp(3) with time zone NOT NULL,
  	"max_marks" numeric,
  	"allow_late" boolean DEFAULT false,
  	"status" "enum_assignments_status" DEFAULT 'draft' NOT NULL,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assignment_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assignment_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"text" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"late" boolean DEFAULT false,
  	"marks" numeric,
  	"feedback" varchar,
  	"marked_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "school_settings_grade_bands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"min_percent" numeric NOT NULL,
  	"remark" varchar
  );
  
  CREATE TABLE "school_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"school_name" varchar DEFAULT 'My School' NOT NULL,
  	"motto" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"address" varchar,
  	"principal_name" varchar,
  	"report_footer" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notices_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notice_reads_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "timetable_slots_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assignments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assignment_submissions_id" integer;
  ALTER TABLE "notices" ADD CONSTRAINT "notices_audience_class_id_classes_id_fk" FOREIGN KEY ("audience_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_marked_by_id_users_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "school_settings_grade_bands" ADD CONSTRAINT "school_settings_grade_bands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."school_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "notices_audience_class_idx" ON "notices" USING btree ("audience_class_id");
  CREATE INDEX "notices_status_idx" ON "notices" USING btree ("status");
  CREATE INDEX "notices_created_by_idx" ON "notices" USING btree ("created_by_id");
  CREATE INDEX "notices_updated_at_idx" ON "notices" USING btree ("updated_at");
  CREATE INDEX "notices_created_at_idx" ON "notices" USING btree ("created_at");
  CREATE INDEX "notice_reads_notice_idx" ON "notice_reads" USING btree ("notice_id");
  CREATE INDEX "notice_reads_user_idx" ON "notice_reads" USING btree ("user_id");
  CREATE INDEX "notice_reads_updated_at_idx" ON "notice_reads" USING btree ("updated_at");
  CREATE INDEX "notice_reads_created_at_idx" ON "notice_reads" USING btree ("created_at");
  CREATE INDEX "events_start_date_idx" ON "events" USING btree ("start_date");
  CREATE INDEX "events_class_idx" ON "events" USING btree ("class_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "timetable_slots_class_idx" ON "timetable_slots" USING btree ("class_id");
  CREATE INDEX "timetable_slots_subject_idx" ON "timetable_slots" USING btree ("subject_id");
  CREATE INDEX "timetable_slots_teacher_idx" ON "timetable_slots" USING btree ("teacher_id");
  CREATE INDEX "timetable_slots_day_of_week_idx" ON "timetable_slots" USING btree ("day_of_week");
  CREATE INDEX "timetable_slots_updated_at_idx" ON "timetable_slots" USING btree ("updated_at");
  CREATE INDEX "timetable_slots_created_at_idx" ON "timetable_slots" USING btree ("created_at");
  CREATE INDEX "assignments_class_idx" ON "assignments" USING btree ("class_id");
  CREATE INDEX "assignments_subject_idx" ON "assignments" USING btree ("subject_id");
  CREATE INDEX "assignments_status_idx" ON "assignments" USING btree ("status");
  CREATE INDEX "assignments_created_by_idx" ON "assignments" USING btree ("created_by_id");
  CREATE INDEX "assignments_updated_at_idx" ON "assignments" USING btree ("updated_at");
  CREATE INDEX "assignments_created_at_idx" ON "assignments" USING btree ("created_at");
  CREATE INDEX "assignment_submissions_assignment_idx" ON "assignment_submissions" USING btree ("assignment_id");
  CREATE INDEX "assignment_submissions_student_idx" ON "assignment_submissions" USING btree ("student_id");
  CREATE INDEX "assignment_submissions_marked_by_idx" ON "assignment_submissions" USING btree ("marked_by_id");
  CREATE INDEX "assignment_submissions_updated_at_idx" ON "assignment_submissions" USING btree ("updated_at");
  CREATE INDEX "assignment_submissions_created_at_idx" ON "assignment_submissions" USING btree ("created_at");
  CREATE INDEX "school_settings_grade_bands_order_idx" ON "school_settings_grade_bands" USING btree ("_order");
  CREATE INDEX "school_settings_grade_bands_parent_id_idx" ON "school_settings_grade_bands" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notices_fk" FOREIGN KEY ("notices_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notice_reads_fk" FOREIGN KEY ("notice_reads_id") REFERENCES "public"."notice_reads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_timetable_slots_fk" FOREIGN KEY ("timetable_slots_id") REFERENCES "public"."timetable_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assignments_fk" FOREIGN KEY ("assignments_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assignment_submissions_fk" FOREIGN KEY ("assignment_submissions_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_notices_id_idx" ON "payload_locked_documents_rels" USING btree ("notices_id");
  CREATE INDEX "payload_locked_documents_rels_notice_reads_id_idx" ON "payload_locked_documents_rels" USING btree ("notice_reads_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_timetable_slots_id_idx" ON "payload_locked_documents_rels" USING btree ("timetable_slots_id");
  CREATE INDEX "payload_locked_documents_rels_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("assignments_id");
  CREATE INDEX "payload_locked_documents_rels_assignment_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("assignment_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notice_reads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "timetable_slots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assignments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assignment_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "school_settings_grade_bands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "school_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "notices" CASCADE;
  DROP TABLE "notice_reads" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "timetable_slots" CASCADE;
  DROP TABLE "assignments" CASCADE;
  DROP TABLE "assignment_submissions" CASCADE;
  DROP TABLE "school_settings_grade_bands" CASCADE;
  DROP TABLE "school_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notices_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notice_reads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_timetable_slots_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assignments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assignment_submissions_fk";
  
  DROP INDEX "payload_locked_documents_rels_notices_id_idx";
  DROP INDEX "payload_locked_documents_rels_notice_reads_id_idx";
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_timetable_slots_id_idx";
  DROP INDEX "payload_locked_documents_rels_assignments_id_idx";
  DROP INDEX "payload_locked_documents_rels_assignment_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "notices_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "notice_reads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "timetable_slots_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assignments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assignment_submissions_id";
  DROP TYPE "public"."enum_notices_audience";
  DROP TYPE "public"."enum_notices_audience_role";
  DROP TYPE "public"."enum_notices_status";
  DROP TYPE "public"."enum_events_type";
  DROP TYPE "public"."enum_timetable_slots_day_of_week";
  DROP TYPE "public"."enum_assignments_status";`)
}
