import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberStockControlTables1771000000000 implements MigrationInterface {
  name = "AddRubberStockControlTables1771000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rubber_compound_stock" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "compound_coding_id" integer NOT NULL,
        "quantity_kg" decimal(12,3) NOT NULL DEFAULT 0,
        "min_stock_level_kg" decimal(12,3) NOT NULL DEFAULT 0,
        "reorder_point_kg" decimal(12,3) NOT NULL DEFAULT 0,
        "cost_per_kg" decimal(10,2),
        "location" character varying(100),
        "batch_number" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_compound_stock_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_compound_stock" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_compound_stock_coding" FOREIGN KEY ("compound_coding_id")
          REFERENCES "rubber_product_coding"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rubber_compound_movement_type_enum" AS ENUM ('IN', 'OUT', 'ADJUSTMENT')
    `);

    await queryRunner.query(`
      CREATE TYPE "rubber_compound_movement_reference_type_enum" AS ENUM ('PURCHASE', 'PRODUCTION', 'MANUAL', 'STOCK_TAKE')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_compound_movements" (
        "id" SERIAL NOT NULL,
        "compound_stock_id" integer NOT NULL,
        "movement_type" "rubber_compound_movement_type_enum" NOT NULL,
        "quantity_kg" decimal(12,3) NOT NULL,
        "reference_type" "rubber_compound_movement_reference_type_enum" NOT NULL,
        "reference_id" integer,
        "batch_number" character varying(100),
        "notes" text,
        "created_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_compound_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_compound_movements_stock" FOREIGN KEY ("compound_stock_id")
          REFERENCES "rubber_compound_stock"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rubber_production_status_enum" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_productions" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "production_number" character varying(50) NOT NULL,
        "product_id" integer NOT NULL,
        "compound_stock_id" integer NOT NULL,
        "thickness_mm" decimal(6,2) NOT NULL,
        "width_mm" decimal(8,2) NOT NULL,
        "length_m" decimal(8,2) NOT NULL,
        "quantity" integer NOT NULL,
        "compound_used_kg" decimal(12,3),
        "status" "rubber_production_status_enum" NOT NULL DEFAULT 'PENDING',
        "order_id" integer,
        "notes" text,
        "created_by" character varying(100),
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_productions_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_productions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_productions_product" FOREIGN KEY ("product_id")
          REFERENCES "rubber_product"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_rubber_productions_compound_stock" FOREIGN KEY ("compound_stock_id")
          REFERENCES "rubber_compound_stock"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rubber_compound_order_status_enum" AS ENUM ('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_compound_orders" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "order_number" character varying(50) NOT NULL,
        "compound_stock_id" integer NOT NULL,
        "quantity_kg" decimal(12,3) NOT NULL,
        "status" "rubber_compound_order_status_enum" NOT NULL DEFAULT 'PENDING',
        "is_auto_generated" boolean NOT NULL DEFAULT false,
        "supplier_name" character varying(200),
        "expected_delivery" date,
        "notes" text,
        "created_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_compound_orders_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_compound_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_compound_orders_stock" FOREIGN KEY ("compound_stock_id")
          REFERENCES "rubber_compound_stock"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_compound_stock_coding" ON "rubber_compound_stock" ("compound_coding_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_compound_movements_stock" ON "rubber_compound_movements" ("compound_stock_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_compound_movements_type" ON "rubber_compound_movements" ("movement_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_productions_status" ON "rubber_productions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_productions_product" ON "rubber_productions" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_compound_orders_status" ON "rubber_compound_orders" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_compound_orders_stock" ON "rubber_compound_orders" ("compound_stock_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_orders_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_productions_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_productions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_movements_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_movements_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_stock_coding"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_compound_orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rubber_compound_order_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_productions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rubber_production_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_compound_movements"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rubber_compound_movement_reference_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rubber_compound_movement_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_compound_stock"`);
  }
}
