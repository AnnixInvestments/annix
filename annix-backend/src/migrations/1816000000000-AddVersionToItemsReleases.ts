import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddVersionToItemsReleases1816000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'qc_items_releases' AND column_name = 'version'
        ) THEN
          ALTER TABLE qc_items_releases ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE qc_items_releases DROP COLUMN IF EXISTS version");
  }
}
