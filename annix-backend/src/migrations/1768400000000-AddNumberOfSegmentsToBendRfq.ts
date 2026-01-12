import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNumberOfSegmentsToBendRfq1768400000000 implements MigrationInterface {
  name = 'AddNumberOfSegmentsToBendRfq1768400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "number_of_segments" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      DROP COLUMN IF EXISTS "number_of_segments"
    `);
  }
}
