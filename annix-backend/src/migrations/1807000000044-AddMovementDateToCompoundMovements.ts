import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMovementDateToCompoundMovements1807000000044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_compound_movements" ADD COLUMN IF NOT EXISTS "movement_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_compound_movements" DROP COLUMN IF EXISTS "movement_date"
    `);
  }
}
