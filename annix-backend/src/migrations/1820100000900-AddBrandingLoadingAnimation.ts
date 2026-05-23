import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingLoadingAnimation1820100000900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        ADD COLUMN IF NOT EXISTS loading_animation VARCHAR(32) NOT NULL DEFAULT 'pulse'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE app_branding DROP COLUMN IF EXISTS loading_animation");
  }
}
