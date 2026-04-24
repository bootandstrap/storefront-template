import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260416022615 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "crm_contact" ("id" text not null, "email" text not null, "full_name" text null, "phone" text null, "company" text null, "source" text check ("source" in ('organic', 'referral', 'social', 'ads', 'direct', 'other')) not null default 'direct', "stage" text check ("stage" in ('lead', 'prospect', 'customer', 'churned', 'vip')) not null default 'lead', "lifetime_value" integer not null default 0, "order_count" integer not null default 0, "last_interaction_at" timestamptz null, "tags" jsonb null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_contact_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_contact_deleted_at" ON "crm_contact" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_contact_email" ON "crm_contact" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_contact_stage" ON "crm_contact" ("stage") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_contact_source" ON "crm_contact" ("source") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "crm_interaction" ("id" text not null, "contact_id" text not null, "type" text check ("type" in ('order', 'email', 'call', 'note', 'support', 'visit', 'other')) not null default 'note', "summary" text not null, "content" text null, "reference_id" text null, "reference_type" text null, "initiated_by" text check ("initiated_by" in ('system', 'operator', 'contact')) not null default 'system', "operator_name" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_interaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_interaction_deleted_at" ON "crm_interaction" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_interaction_contact_id" ON "crm_interaction" ("contact_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_interaction_type" ON "crm_interaction" ("type") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "crm_segment" ("id" text not null, "name" text not null, "description" text null, "color" text not null default '#6366f1', "rules" jsonb not null, "is_system" boolean not null default false, "contact_count" integer not null default 0, "last_evaluated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_segment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_segment_deleted_at" ON "crm_segment" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_segment_name" ON "crm_segment" ("name") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "crm_contact" cascade;`);

    this.addSql(`drop table if exists "crm_interaction" cascade;`);

    this.addSql(`drop table if exists "crm_segment" cascade;`);
  }

}
