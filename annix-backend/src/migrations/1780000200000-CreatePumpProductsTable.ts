import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePumpProductsTable1780000200000 implements MigrationInterface {
  name = "CreatePumpProductsTable1780000200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."pump_products_status_enum" AS ENUM('active', 'inactive', 'discontinued')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pump_products_category_enum" AS ENUM('centrifugal', 'positive_displacement', 'specialty')
    `);

    await queryRunner.query(`
      CREATE TABLE "pump_products" (
        "id" SERIAL NOT NULL,
        "sku" character varying(50) NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text,
        "pump_type" character varying(100) NOT NULL,
        "category" "public"."pump_products_category_enum" NOT NULL,
        "status" "public"."pump_products_status_enum" NOT NULL DEFAULT 'active',
        "manufacturer" character varying(100) NOT NULL,
        "model_number" character varying(100),
        "api_610_type" character varying(20),
        "flow_rate_min" numeric(10,2),
        "flow_rate_max" numeric(10,2),
        "head_min" numeric(10,2),
        "head_max" numeric(10,2),
        "max_temperature" numeric(6,2),
        "max_pressure" numeric(8,2),
        "suction_size" character varying(20),
        "discharge_size" character varying(20),
        "casing_material" character varying(50),
        "impeller_material" character varying(50),
        "shaft_material" character varying(50),
        "seal_type" character varying(50),
        "motor_power_kw" numeric(10,2),
        "voltage" character varying(20),
        "frequency" character varying(10),
        "weight_kg" numeric(10,2),
        "certifications" text[] DEFAULT '{}',
        "applications" text[] DEFAULT '{}',
        "base_cost" numeric(12,2),
        "list_price" numeric(12,2),
        "markup_percentage" numeric(5,2) NOT NULL DEFAULT '15',
        "lead_time_days" integer,
        "stock_quantity" integer NOT NULL DEFAULT '0',
        "datasheet_url" character varying(500),
        "image_url" character varying(500),
        "specifications" jsonb,
        "pump_curve_data" jsonb,
        "notes" text,
        "supplier_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pump_products_sku" UNIQUE ("sku"),
        CONSTRAINT "PK_pump_products" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_products_category" ON "pump_products" ("category")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_products_manufacturer" ON "pump_products" ("manufacturer")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_products_status" ON "pump_products" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pump_products_pump_type" ON "pump_products" ("pump_type")
    `);

    await queryRunner.query(`
      ALTER TABLE "pump_products"
      ADD CONSTRAINT "FK_pump_products_supplier"
      FOREIGN KEY ("supplier_id")
      REFERENCES "supplier_profiles"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pump_products" DROP CONSTRAINT "FK_pump_products_supplier"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_products_pump_type"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_products_status"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_products_manufacturer"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_pump_products_category"
    `);

    await queryRunner.query(`
      DROP TABLE "pump_products"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."pump_products_category_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."pump_products_status_enum"
    `);
  }
}
