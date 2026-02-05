import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRubberPortalTables1738500000000
  implements MigrationInterface
{
  name = 'CreateRubberPortalTables1738500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "product_coding_type_enum" AS ENUM ('COLOUR', 'COMPOUND', 'CURING_METHOD', 'GRADE', 'HARDNESS', 'TYPE')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_product_coding" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL UNIQUE,
        "coding_type" "product_coding_type_enum" NOT NULL,
        "code" character varying(20) NOT NULL,
        "name" character varying(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_product_coding" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_pricing_tier" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL UNIQUE,
        "name" character varying(100) NOT NULL,
        "pricing_factor" decimal(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_pricing_tier" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_company" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL UNIQUE,
        "name" character varying(200) NOT NULL,
        "code" character varying(20),
        "pricing_tier_firebase_uid" character varying(100),
        "pricing_tier_id" integer,
        "available_products" jsonb NOT NULL DEFAULT '[]',
        "is_compound_owner" boolean NOT NULL DEFAULT false,
        "vat_number" character varying(50),
        "registration_number" character varying(50),
        "address" jsonb,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_company" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_company_pricing_tier" FOREIGN KEY ("pricing_tier_id") REFERENCES "rubber_pricing_tier"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_product" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL UNIQUE,
        "title" character varying(200),
        "description" text,
        "specific_gravity" decimal(10,4),
        "compound_owner_firebase_uid" character varying(100),
        "compound_firebase_uid" character varying(100),
        "type_firebase_uid" character varying(100),
        "cost_per_kg" decimal(10,2),
        "colour_firebase_uid" character varying(100),
        "hardness_firebase_uid" character varying(100),
        "curing_method_firebase_uid" character varying(100),
        "grade_firebase_uid" character varying(100),
        "markup" decimal(10,2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_product" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_order" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL UNIQUE,
        "order_number" character varying(50) NOT NULL,
        "company_order_number" character varying(100),
        "status" integer NOT NULL DEFAULT 0,
        "company_firebase_uid" character varying(100),
        "company_id" integer,
        "created_by_firebase_uid" character varying(100),
        "updated_by_firebase_uid" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_order" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_order_company" FOREIGN KEY ("company_id") REFERENCES "rubber_company"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_order_item" (
        "id" SERIAL NOT NULL,
        "order_id" integer NOT NULL,
        "product_firebase_uid" character varying(100),
        "product_id" integer,
        "thickness" decimal(10,2),
        "width" decimal(10,2),
        "length" decimal(10,2),
        "quantity" integer,
        "call_offs" jsonb NOT NULL DEFAULT '[]',
        "created_by_firebase_uid" character varying(100),
        "updated_by_firebase_uid" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_order_item" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_order_item_order" FOREIGN KEY ("order_id") REFERENCES "rubber_order"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rubber_order_item_product" FOREIGN KEY ("product_id") REFERENCES "rubber_product"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_product_coding_type" ON "rubber_product_coding" ("coding_type")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_order_status" ON "rubber_order" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_order_company" ON "rubber_order" ("company_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rubber_order_item_order" ON "rubber_order_item" ("order_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_order_item_order"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_order_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_order_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_product_coding_type"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_order_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_pricing_tier"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_product_coding"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "product_coding_type_enum"`);
  }
}
