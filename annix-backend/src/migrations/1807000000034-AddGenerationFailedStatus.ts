import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGenerationFailedStatus1807000000034 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE au_coc_readiness_status ADD VALUE IF NOT EXISTS 'GENERATION_FAILED'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum type
  }
}
