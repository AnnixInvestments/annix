import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingPerModeColours1820100003500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        ADD COLUMN IF NOT EXISTS navbar_color_light VARCHAR(9) NOT NULL DEFAULT '#F2F4F7',
        ADD COLUMN IF NOT EXISTS background_light VARCHAR(9) NOT NULL DEFAULT '#F8FAFC',
        ADD COLUMN IF NOT EXISTS background_dark VARCHAR(9) NOT NULL DEFAULT '#0F172A'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        DROP COLUMN IF EXISTS navbar_color_light,
        DROP COLUMN IF EXISTS background_light,
        DROP COLUMN IF EXISTS background_dark
    `);
  }
}
