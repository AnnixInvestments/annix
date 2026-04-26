import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingToRubberAppProfile1820100000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_app_profile
      ADD COLUMN IF NOT EXISTS hero_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS primary_color VARCHAR(16),
      ADD COLUMN IF NOT EXISTS accent_color VARCHAR(16)
    `);
  }

  public async down(): Promise<void> {}
}
