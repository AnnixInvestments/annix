import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompoundMovementStockRefTypes1803700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "rubber_compound_movement_reference_type_enum" ADD VALUE IF NOT EXISTS 'INVOICE_RECEIPT'
    `);
    await queryRunner.query(`
      ALTER TYPE "rubber_compound_movement_reference_type_enum" ADD VALUE IF NOT EXISTS 'DELIVERY_DEDUCTION'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "rubber_compound_movements"
      WHERE "reference_type" IN ('INVOICE_RECEIPT', 'DELIVERY_DEDUCTION')
    `);
  }
}
