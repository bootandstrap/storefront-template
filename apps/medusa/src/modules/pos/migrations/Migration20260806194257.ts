import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260806194257 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pos_refund_operation" ("id" text not null, "tenant_id" text not null, "order_id" text not null, "operation_id" text not null, "idempotency_key" text not null, "payload_sha256" text not null, "amount_minor" integer not null, "items" jsonb not null, "status" text check ("status" in ('pending', 'acknowledged', 'failed')) not null default 'pending', "refund_id" text null, "failure_code" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_refund_operation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_refund_operation_deleted_at" ON "pos_refund_operation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pos_refund_operation_tenant_id_idempotency_key_unique" ON "pos_refund_operation" ("tenant_id", "idempotency_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pos_refund_operation_tenant_id_operation_id_unique" ON "pos_refund_operation" ("tenant_id", "operation_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_refund_operation_tenant_id_order_id_status" ON "pos_refund_operation" ("tenant_id", "order_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_refund_operation_refund_id" ON "pos_refund_operation" ("refund_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_refund_operation" cascade;`);
  }

}
