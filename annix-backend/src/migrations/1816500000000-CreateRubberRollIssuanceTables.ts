import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberRollIssuanceTables1816500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rubber_roll_issuances_status_enum') THEN
          CREATE TYPE "rubber_roll_issuances_status_enum" AS ENUM ('ACTIVE', 'RETURNED', 'CANCELLED');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_roll_issuances" (
        "id" SERIAL PRIMARY KEY,
        "roll_stock_id" integer NOT NULL REFERENCES "rubber_roll_stock"("id"),
        "issued_by" varchar(200) NOT NULL,
        "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "roll_weight_at_issue_kg" decimal(12,3) NOT NULL,
        "total_estimated_usage_kg" decimal(12,3),
        "expected_return_kg" decimal(12,3),
        "photo_path" varchar(500),
        "notes" text,
        "status" "rubber_roll_issuances_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_roll_issuance_items" (
        "id" SERIAL PRIMARY KEY,
        "issuance_id" integer NOT NULL REFERENCES "rubber_roll_issuances"("id") ON DELETE CASCADE,
        "job_card_id" integer NOT NULL,
        "jc_number" varchar(500) NOT NULL,
        "job_name" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_roll_issuance_line_items" (
        "id" SERIAL PRIMARY KEY,
        "issuance_item_id" integer NOT NULL REFERENCES "rubber_roll_issuance_items"("id") ON DELETE CASCADE,
        "line_item_id" integer NOT NULL,
        "item_description" text,
        "item_no" varchar(500),
        "quantity" integer,
        "m2" decimal(12,4),
        "estimated_weight_kg" decimal(12,3),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_roll_issuances_roll_stock_id ON rubber_roll_issuances(roll_stock_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_roll_issuances_status ON rubber_roll_issuances(status)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_roll_issuance_items_issuance_id ON rubber_roll_issuance_items(issuance_id)",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_roll_issuance_items_job_card_id ON rubber_roll_issuance_items(job_card_id)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_roll_issuance_line_items");
    await queryRunner.query("DROP TABLE IF EXISTS rubber_roll_issuance_items");
    await queryRunner.query("DROP TABLE IF EXISTS rubber_roll_issuances");
    await queryRunner.query("DROP TYPE IF EXISTS rubber_roll_issuances_status_enum");
  }
}
