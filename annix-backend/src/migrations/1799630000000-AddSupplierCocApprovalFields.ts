import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierCocApprovalFields1799630000000 implements MigrationInterface {
  name = "AddSupplierCocApprovalFields1799630000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_supplier_cocs"
      ADD COLUMN IF NOT EXISTS "review_notes" text,
      ADD COLUMN IF NOT EXISTS "approved_by" character varying(100),
      ADD COLUMN IF NOT EXISTS "approved_at" timestamp,
      ADD COLUMN IF NOT EXISTS "linked_delivery_note_id" integer
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_supplier_cocs_linked_dn"
      ON "rubber_supplier_cocs" ("linked_delivery_note_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_linked_dn"`);

    await queryRunner.query(`
      ALTER TABLE "rubber_supplier_cocs"
      DROP COLUMN IF EXISTS "linked_delivery_note_id",
      DROP COLUMN IF EXISTS "approved_at",
      DROP COLUMN IF EXISTS "approved_by",
      DROP COLUMN IF EXISTS "review_notes"
    `);
  }
}
