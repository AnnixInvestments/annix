import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBendRfqColumns1768001000000 implements MigrationInterface {
  name = 'AddBendRfqColumns1768001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "wall_thickness_mm" numeric(10,3),
      ADD COLUMN IF NOT EXISTS "bend_end_configuration" character varying(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      DROP COLUMN IF EXISTS "wall_thickness_mm",
      DROP COLUMN IF EXISTS "bend_end_configuration"
    `);
  }
}
