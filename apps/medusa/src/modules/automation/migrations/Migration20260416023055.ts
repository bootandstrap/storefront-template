import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260416023055 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "automation_execution" ("id" text not null, "rule_id" text not null, "trigger_event" text not null, "event_payload" jsonb null, "status" text check ("status" in ('success', 'failed', 'skipped')) not null default 'success', "error_message" text null, "result_data" jsonb null, "duration_ms" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_execution_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_execution_deleted_at" ON "automation_execution" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_execution_rule_id" ON "automation_execution" ("rule_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_execution_status" ON "automation_execution" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "automation_rule" ("id" text not null, "name" text not null, "description" text null, "is_active" boolean not null default true, "trigger_event" text not null, "conditions" jsonb null, "action_type" text check ("action_type" in ('send_email', 'send_webhook', 'update_crm', 'add_tag', 'create_note', 'notify_owner', 'custom')) not null default 'notify_owner', "action_config" jsonb not null, "execution_count" integer not null default 0, "last_executed_at" timestamptz null, "priority" integer not null default 100, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_rule_deleted_at" ON "automation_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_rule_trigger_event" ON "automation_rule" ("trigger_event") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_rule_is_active" ON "automation_rule" ("is_active") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "automation_execution" cascade;`);

    this.addSql(`drop table if exists "automation_rule" cascade;`);
  }

}
