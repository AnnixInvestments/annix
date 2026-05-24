import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingTextCrop1820100001500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        ADD COLUMN IF NOT EXISTS text_crop_path VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE app_branding DROP COLUMN IF EXISTS text_crop_path");
  }
}
