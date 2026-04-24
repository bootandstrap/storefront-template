import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260416022621 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "email_campaign" ("id" text not null, "name" text not null, "subject" text not null, "template_id" text null, "segment_id" text null, "status" text check ("status" in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed')) not null default 'draft', "scheduled_at" timestamptz null, "sent_at" timestamptz null, "recipient_count" integer not null default 0, "open_count" integer not null default 0, "click_count" integer not null default 0, "bounce_count" integer not null default 0, "type" text check ("type" in ('campaign', 'abandoned_cart', 'order_follow_up', 'review_request', 'newsletter')) not null default 'campaign', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_campaign_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_campaign_deleted_at" ON "email_campaign" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_campaign_status" ON "email_campaign" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_campaign_type" ON "email_campaign" ("type") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "email_send" ("id" text not null, "campaign_id" text not null, "recipient_email" text not null, "status" text check ("status" in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')) not null default 'queued', "sent_at" timestamptz null, "opened_at" timestamptz null, "clicked_at" timestamptz null, "error_message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_send_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_send_deleted_at" ON "email_send" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_send_campaign_id" ON "email_send" ("campaign_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_send_status" ON "email_send" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_send_recipient_email" ON "email_send" ("recipient_email") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "email_template" ("id" text not null, "name" text not null, "type" text check ("type" in ('marketing', 'transactional', 'system')) not null default 'marketing', "subject_template" text not null, "html_body" text not null, "text_body" text null, "variables_schema" jsonb null, "is_system" boolean not null default false, "preview_text" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_template_deleted_at" ON "email_template" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_template_type" ON "email_template" ("type") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_campaign" cascade;`);

    this.addSql(`drop table if exists "email_send" cascade;`);

    this.addSql(`drop table if exists "email_template" cascade;`);
  }

}
