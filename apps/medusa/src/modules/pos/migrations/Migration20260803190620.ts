import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260803190620 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`create table if not exists "pos_sync_operation" ("id" text not null, "tenant_id" text not null, "operation_id" text not null, "idempotency_key" text not null, "client_id" text not null, "client_sequence" integer not null, "server_sequence" integer not null, "amount_minor" integer not null, "payload_sha256" text not null, "status" text check ("status" in ('reserved', 'committed')) not null default 'reserved', "order_id" text null, "draft_order_id" text null, "display_id" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_sync_operation_pkey" primary key ("id"));`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sync_operation_deleted_at" ON "pos_sync_operation" ("deleted_at") WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pos_sync_operation_tenant_id_idempotency_key_unique" ON "pos_sync_operation" ("tenant_id", "idempotency_key") WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pos_sync_operation_tenant_id_operation_id_unique" ON "pos_sync_operation" ("tenant_id", "operation_id") WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sync_operation_tenant_id_server_sequence" ON "pos_sync_operation" ("tenant_id", "server_sequence") WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_sync_operation_status" ON "pos_sync_operation" ("status") WHERE deleted_at IS NULL;`)
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "pos_sync_operation" cascade;`)
    }
}
