import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierCocOverdueWarnedAt1820100000400 implements MigrationInterface {
  name = "AddSupplierCocOverdueWarnedAt1820100000400";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rubber_delivery_notes" ADD COLUMN IF NOT EXISTS "coc_overdue_warned_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rubber_delivery_notes" DROP COLUMN IF EXISTS "coc_overdue_warned_at"`,
    );
  }
}
