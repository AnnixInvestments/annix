import type { MigrationInterface, QueryRunner } from "typeorm";

export class WidenFeatureFlagsDescription1820100000075 implements MigrationInterface {
  name = "WidenFeatureFlagsDescription1820100000075";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "feature_flags"
        ALTER COLUMN "description" TYPE text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "feature_flags"
        ALTER COLUMN "description" TYPE varchar(255)
    `);
  }
}
