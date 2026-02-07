import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePumpOrderTables1780000300000 implements MigrationInterface {
  name = 'CreatePumpOrderTables1780000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."pump_orders_status_enum" AS ENUM(
        'draft',
        'submitted',
        'confirmed',
        'in_production',
        'ready_for_dispatch',
        'dispatched',
        'delivered',
        'completed',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pump_orders_order_type_enum" AS ENUM(
        'new_pump',
        'spare_parts',
        'repair',
        'rental'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pump_order_items_item_type_enum" AS ENUM(
        'new_pump',
        'spare_part',
        'accessory',
        'service'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pump_orders" (
        "id" SERIAL NOT NULL,
        "order_number" character varying(50) NOT NULL,
        "customer_reference" character varying(100),
        "status" "public"."pump_orders_status_enum" NOT NULL DEFAULT 'draft',
        "order_type" "public"."pump_orders_order_type_enum" NOT NULL,
        "rfq_id" integer,
        "customer_company" character varying(200),
        "customer_contact" character varying(200),
        "customer_email" character varying(200),
        "customer_phone" character varying(50),
        "delivery_address" text,
        "requested_delivery_date" date,
        "confirmed_delivery_date" date,
        "supplier_id" integer,
        "subtotal" numeric(12,2) NOT NULL DEFAULT '0',
        "vat_amount" numeric(12,2) NOT NULL DEFAULT '0',
        "total_amount" numeric(12,2) NOT NULL DEFAULT '0',
        "currency" character varying(3) NOT NULL DEFAULT 'ZAR',
        "special_instructions" text,
        "internal_notes" text,
        "status_history" jsonb NOT NULL DEFAULT '[]',
        "created_by" character varying(100),
        "updated_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pump_orders_order_number" UNIQUE ("order_number"),
        CONSTRAINT "PK_pump_orders" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pump_order_items" (
        "id" SERIAL NOT NULL,
        "order_id" integer NOT NULL,
        "product_id" integer,
        "item_type" "public"."pump_order_items_item_type_enum" NOT NULL DEFAULT 'new_pump',
        "description" text NOT NULL,
        "pump_type" character varying(100),
        "manufacturer" character varying(100),
        "model_number" character varying(100),
        "part_number" character varying(100),
        "flow_rate" numeric(10,2),
        "head" numeric(10,2),
        "motor_power_kw" numeric(10,2),
        "casing_material" character varying(50),
        "impeller_material" character varying(50),
        "seal_type" character varying(50),
        "quantity" integer NOT NULL DEFAULT '1',
        "unit_price" numeric(12,2) NOT NULL,
        "discount_percent" numeric(5,2) NOT NULL DEFAULT '0',
        "line_total" numeric(12,2) NOT NULL,
        "lead_time_days" integer,
        "notes" text,
        "specifications" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pump_order_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_orders_status" ON "pump_orders" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_orders_order_type" ON "pump_orders" ("order_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_orders_customer_company" ON "pump_orders" ("customer_company")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_orders_created_at" ON "pump_orders" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_order_items_order_id" ON "pump_order_items" ("order_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "pump_orders"
      ADD CONSTRAINT "FK_pump_orders_supplier"
      FOREIGN KEY ("supplier_id")
      REFERENCES "supplier_profiles"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "pump_order_items"
      ADD CONSTRAINT "FK_pump_order_items_order"
      FOREIGN KEY ("order_id")
      REFERENCES "pump_orders"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "pump_order_items"
      ADD CONSTRAINT "FK_pump_order_items_product"
      FOREIGN KEY ("product_id")
      REFERENCES "pump_products"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pump_order_items" DROP CONSTRAINT "FK_pump_order_items_product"
    `);

    await queryRunner.query(`
      ALTER TABLE "pump_order_items" DROP CONSTRAINT "FK_pump_order_items_order"
    `);

    await queryRunner.query(`
      ALTER TABLE "pump_orders" DROP CONSTRAINT "FK_pump_orders_supplier"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_order_items_order_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_orders_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_orders_customer_company"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_orders_order_type"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_orders_status"
    `);

    await queryRunner.query(`
      DROP TABLE "pump_order_items"
    `);

    await queryRunner.query(`
      DROP TABLE "pump_orders"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."pump_order_items_item_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."pump_orders_order_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."pump_orders_status_enum"
    `);
  }
}
