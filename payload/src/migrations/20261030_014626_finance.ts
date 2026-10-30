import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_invoices_status" AS ENUM('issued', 'void');
  CREATE TYPE "public"."enum_payments_method" AS ENUM('cash', 'mpesa', 'bank', 'cheque', 'other');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('valid', 'reversed');
  CREATE TABLE "fee_structures_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"amount" numeric NOT NULL
  );
  
  CREATE TABLE "fee_structures" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"term_id" integer NOT NULL,
  	"class_id" integer NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invoices_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"description" varchar NOT NULL,
  	"amount" numeric NOT NULL
  );
  
  CREATE TABLE "invoices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"student_id" integer NOT NULL,
  	"term_id" integer NOT NULL,
  	"structure_id" integer,
  	"total" numeric,
  	"status" "enum_invoices_status" DEFAULT 'issued',
  	"void_reason" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"receipt_number" varchar,
  	"student_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"method" "enum_payments_method" DEFAULT 'cash' NOT NULL,
  	"reference" varchar,
  	"paid_at" timestamp(3) with time zone NOT NULL,
  	"note" varchar,
  	"status" "enum_payments_status" DEFAULT 'valid',
  	"reversal_reason" varchar,
  	"recorded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fee_adjustments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"reason" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fee_structures_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "invoices_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fee_adjustments_id" integer;
  ALTER TABLE "fee_structures_items" ADD CONSTRAINT "fee_structures_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."fee_structures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices_lines" ADD CONSTRAINT "invoices_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_structure_id_fee_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."fee_structures"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fee_adjustments" ADD CONSTRAINT "fee_adjustments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fee_adjustments" ADD CONSTRAINT "fee_adjustments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "fee_structures_items_order_idx" ON "fee_structures_items" USING btree ("_order");
  CREATE INDEX "fee_structures_items_parent_id_idx" ON "fee_structures_items" USING btree ("_parent_id");
  CREATE INDEX "fee_structures_term_idx" ON "fee_structures" USING btree ("term_id");
  CREATE INDEX "fee_structures_class_idx" ON "fee_structures" USING btree ("class_id");
  CREATE INDEX "fee_structures_updated_at_idx" ON "fee_structures" USING btree ("updated_at");
  CREATE INDEX "fee_structures_created_at_idx" ON "fee_structures" USING btree ("created_at");
  CREATE INDEX "invoices_lines_order_idx" ON "invoices_lines" USING btree ("_order");
  CREATE INDEX "invoices_lines_parent_id_idx" ON "invoices_lines" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "invoices_number_idx" ON "invoices" USING btree ("number");
  CREATE INDEX "invoices_student_idx" ON "invoices" USING btree ("student_id");
  CREATE INDEX "invoices_term_idx" ON "invoices" USING btree ("term_id");
  CREATE INDEX "invoices_structure_idx" ON "invoices" USING btree ("structure_id");
  CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");
  CREATE INDEX "invoices_created_by_idx" ON "invoices" USING btree ("created_by_id");
  CREATE INDEX "invoices_updated_at_idx" ON "invoices" USING btree ("updated_at");
  CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");
  CREATE UNIQUE INDEX "payments_receipt_number_idx" ON "payments" USING btree ("receipt_number");
  CREATE INDEX "payments_student_idx" ON "payments" USING btree ("student_id");
  CREATE INDEX "payments_reference_idx" ON "payments" USING btree ("reference");
  CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
  CREATE INDEX "payments_recorded_by_idx" ON "payments" USING btree ("recorded_by_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "fee_adjustments_student_idx" ON "fee_adjustments" USING btree ("student_id");
  CREATE INDEX "fee_adjustments_created_by_idx" ON "fee_adjustments" USING btree ("created_by_id");
  CREATE INDEX "fee_adjustments_updated_at_idx" ON "fee_adjustments" USING btree ("updated_at");
  CREATE INDEX "fee_adjustments_created_at_idx" ON "fee_adjustments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fee_structures_fk" FOREIGN KEY ("fee_structures_id") REFERENCES "public"."fee_structures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fee_adjustments_fk" FOREIGN KEY ("fee_adjustments_id") REFERENCES "public"."fee_adjustments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_fee_structures_id_idx" ON "payload_locked_documents_rels" USING btree ("fee_structures_id");
  CREATE INDEX "payload_locked_documents_rels_invoices_id_idx" ON "payload_locked_documents_rels" USING btree ("invoices_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_fee_adjustments_id_idx" ON "payload_locked_documents_rels" USING btree ("fee_adjustments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "fee_structures_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "fee_structures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "invoices_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "fee_adjustments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "fee_structures_items" CASCADE;
  DROP TABLE "fee_structures" CASCADE;
  DROP TABLE "invoices_lines" CASCADE;
  DROP TABLE "invoices" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "fee_adjustments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fee_structures_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_invoices_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fee_adjustments_fk";
  
  DROP INDEX "payload_locked_documents_rels_fee_structures_id_idx";
  DROP INDEX "payload_locked_documents_rels_invoices_id_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload_locked_documents_rels_fee_adjustments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fee_structures_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "invoices_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fee_adjustments_id";
  DROP TYPE "public"."enum_invoices_status";
  DROP TYPE "public"."enum_payments_method";
  DROP TYPE "public"."enum_payments_status";`)
}
