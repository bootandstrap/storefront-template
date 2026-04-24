import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260416012242 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pos_session" ("id" text not null, "operator" text not null, "terminal_id" text null, "status" text check ("status" in ('open', 'closed', 'suspended')) not null default 'open', "opening_balance" integer not null default 0, "closing_balance" integer null, "closed_at" timestamptz null, "close_notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_session_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_session_deleted_at" ON "pos_session" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_session_status" ON "pos_session" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_session_operator" ON "pos_session" ("operator") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pos_shift" ("id" text not null, "operator" text not null, "terminal_id" text null, "status" text check ("status" in ('open', 'closed')) not null default 'open', "expected_cash" integer not null default 0, "actual_cash" integer null, "discrepancy" integer null, "transaction_count" integer not null default 0, "total_revenue" integer not null default 0, "closed_at" timestamptz null, "close_notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_shift_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_shift_deleted_at" ON "pos_shift" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_shift_operator" ON "pos_shift" ("operator") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_shift_status" ON "pos_shift" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pos_transaction" ("id" text not null, "order_id" text null, "session_id" text not null, "payment_method" text check ("payment_method" in ('cash', 'card', 'mixed', 'voucher', 'other')) not null default 'cash', "amount" integer not null, "currency_code" text not null default 'CHF', "cash_tendered" integer null, "receipt_number" text null, "customer_name" text null, "status" text check ("status" in ('completed', 'refunded', 'voided')) not null default 'completed', "line_items_snapshot" jsonb null, "discount_percent" integer null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_transaction_deleted_at" ON "pos_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_transaction_session_id" ON "pos_transaction" ("session_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_transaction_order_id" ON "pos_transaction" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_transaction_status" ON "pos_transaction" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_session" cascade;`);

    this.addSql(`drop table if exists "pos_shift" cascade;`);

    this.addSql(`drop table if exists "pos_transaction" cascade;`);
  }

}
