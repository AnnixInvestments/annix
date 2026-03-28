import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRollRejections1809000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "rubber_roll_rejection_status_enum"
          AS ENUM ('PENDING_RETURN', 'RETURNED', 'REPLACEMENT_RECEIVED', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "rubber_roll_stock_status_enum" ADD VALUE IF NOT EXISTS 'REJECTED';
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_roll_rejections" (
        "id" SERIAL PRIMARY KEY,
        "firebase_uid" varchar(100) NOT NULL UNIQUE,
        "original_supplier_coc_id" int NOT NULL
          REFERENCES "rubber_supplier_cocs"("id") ON DELETE CASCADE,
        "roll_number" varchar(100) NOT NULL,
        "roll_stock_id" int
          REFERENCES "rubber_roll_stock"("id") ON DELETE SET NULL,
        "rejection_reason" text NOT NULL,
        "rejected_by" varchar(100) NOT NULL,
        "rejected_at" timestamp NOT NULL DEFAULT now(),
        "return_document_path" varchar(500),
        "replacement_supplier_coc_id" int
          REFERENCES "rubber_supplier_cocs"("id") ON DELETE SET NULL,
        "replacement_roll_number" varchar(100),
        "status" "rubber_roll_rejection_status_enum" NOT NULL DEFAULT 'PENDING_RETURN',
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_roll_rejection_coc_roll"
          UNIQUE ("original_supplier_coc_id", "roll_number")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_roll_rejections_status"
        ON "rubber_roll_rejections" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_roll_rejections"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rubber_roll_rejection_status_enum"`);
  }
}
