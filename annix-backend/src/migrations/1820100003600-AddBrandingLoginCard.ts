import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingLoginCard1820100003600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        ADD COLUMN IF NOT EXISTS login_card_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS login_card_path_dark VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        DROP COLUMN IF EXISTS login_card_path,
        DROP COLUMN IF EXISTS login_card_path_dark
    `);
  }
}
