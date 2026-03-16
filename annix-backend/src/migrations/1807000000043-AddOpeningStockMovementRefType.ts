import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpeningStockMovementRefType1807000000043 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "rubber_compound_movement_reference_type_enum" ADD VALUE IF NOT EXISTS 'OPENING_STOCK'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "rubber_compound_movements"
      WHERE "reference_type" = 'OPENING_STOCK'
    `);
  }
}
