import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalculationDataToBendRfqAndUpdateLfBeDescriptions1768300000000
  implements MigrationInterface
{
  name = 'AddCalculationDataToBendRfqAndUpdateLfBeDescriptions1768300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add calculation_data column to bend_rfqs table
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "calculation_data" jsonb
    `);

    // Update all descriptions containing LF_BE to 2xLF in rfq_items
    await queryRunner.query(`
      UPDATE "rfq_items"
      SET "description" = REPLACE("description", 'LF_BE', '2xLF')
      WHERE "description" LIKE '%LF_BE%'
    `);

    // Update bend_end_configuration in bend_rfqs
    await queryRunner.query(`
      UPDATE "bend_rfqs"
      SET "bend_end_configuration" = REPLACE("bend_end_configuration", 'LF_BE', '2xLF')
      WHERE "bend_end_configuration" LIKE '%LF_BE%'
    `);

    // Update pipe_end_configuration in straight_pipe_rfqs
    await queryRunner.query(`
      UPDATE "straight_pipe_rfqs"
      SET "pipe_end_configuration" = REPLACE("pipe_end_configuration", 'LF_BE', '2xLF')
      WHERE "pipe_end_configuration" LIKE '%LF_BE%'
    `);

    // Update pipe_end_configuration in fitting_rfqs
    await queryRunner.query(`
      UPDATE "fitting_rfqs"
      SET "pipe_end_configuration" = REPLACE("pipe_end_configuration", 'LF_BE', '2xLF')
      WHERE "pipe_end_configuration" LIKE '%LF_BE%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert calculation_data column
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      DROP COLUMN IF EXISTS "calculation_data"
    `);

    // Revert descriptions back to LF_BE
    await queryRunner.query(`
      UPDATE "rfq_items"
      SET "description" = REPLACE("description", '2xLF', 'LF_BE')
      WHERE "description" LIKE '%2xLF%'
    `);

    await queryRunner.query(`
      UPDATE "bend_rfqs"
      SET "bend_end_configuration" = REPLACE("bend_end_configuration", '2xLF', 'LF_BE')
      WHERE "bend_end_configuration" LIKE '%2xLF%'
    `);

    await queryRunner.query(`
      UPDATE "straight_pipe_rfqs"
      SET "pipe_end_configuration" = REPLACE("pipe_end_configuration", '2xLF', 'LF_BE')
      WHERE "pipe_end_configuration" LIKE '%2xLF%'
    `);

    await queryRunner.query(`
      UPDATE "fitting_rfqs"
      SET "pipe_end_configuration" = REPLACE("pipe_end_configuration", '2xLF', 'LF_BE')
      WHERE "pipe_end_configuration" LIKE '%2xLF%'
    `);
  }
}
