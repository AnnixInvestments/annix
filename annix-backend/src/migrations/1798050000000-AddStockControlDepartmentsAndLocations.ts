import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockControlDepartmentsAndLocations1798050000000 implements MigrationInterface {
  name = "AddStockControlDepartmentsAndLocations1798050000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_departments" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "display_order" integer,
        "active" boolean NOT NULL DEFAULT true,
        "company_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_control_departments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_departments"
        ADD CONSTRAINT "FK_stock_control_departments_company"
        FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_locations" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "display_order" integer,
        "active" boolean NOT NULL DEFAULT true,
        "company_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_control_locations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_locations"
        ADD CONSTRAINT "FK_stock_control_locations_company"
        FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_control_staff_members"
      ADD COLUMN IF NOT EXISTS "department_id" integer
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_control_staff_members"
        ADD CONSTRAINT "FK_staff_members_department"
        FOREIGN KEY ("department_id") REFERENCES "stock_control_departments"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_items"
      ADD COLUMN IF NOT EXISTS "location_id" integer
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stock_items"
        ADD CONSTRAINT "FK_stock_items_location"
        FOREIGN KEY ("location_id") REFERENCES "stock_control_locations"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_items"
      DROP CONSTRAINT IF EXISTS "FK_stock_items_location"
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_items"
      DROP COLUMN IF EXISTS "location_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_control_staff_members"
      DROP CONSTRAINT IF EXISTS "FK_staff_members_department"
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_control_staff_members"
      DROP COLUMN IF EXISTS "department_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "stock_control_locations"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "stock_control_departments"
    `);
  }
}
