import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingInheritedFields1820100003300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        ADD COLUMN IF NOT EXISTS inherited_fields text[] NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE app_branding DROP COLUMN IF EXISTS inherited_fields");
  }
}
