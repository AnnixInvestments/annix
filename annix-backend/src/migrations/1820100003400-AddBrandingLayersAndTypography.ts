import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingLayersAndTypography1820100003400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        ADD COLUMN IF NOT EXISTS hero_words VARCHAR(200) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS font_display VARCHAR(100) NOT NULL DEFAULT 'Orbitron',
        ADD COLUMN IF NOT EXISTS font_headings VARCHAR(100) NOT NULL DEFAULT 'Exo 2',
        ADD COLUMN IF NOT EXISTS font_body VARCHAR(100) NOT NULL DEFAULT 'Inter',
        ADD COLUMN IF NOT EXISTS sub_mark_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS flash_line_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS hero_image_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS logo_icon_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS logo_lockup_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS wordmark_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS favicon_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS watermark_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS text_crop_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS sub_mark_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS flash_line_path_dark VARCHAR(500),
        ADD COLUMN IF NOT EXISTS hero_image_path_dark VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_branding
        DROP COLUMN IF EXISTS hero_words,
        DROP COLUMN IF EXISTS font_display,
        DROP COLUMN IF EXISTS font_headings,
        DROP COLUMN IF EXISTS font_body,
        DROP COLUMN IF EXISTS sub_mark_path,
        DROP COLUMN IF EXISTS flash_line_path,
        DROP COLUMN IF EXISTS hero_image_path,
        DROP COLUMN IF EXISTS logo_icon_path_dark,
        DROP COLUMN IF EXISTS logo_lockup_path_dark,
        DROP COLUMN IF EXISTS wordmark_path_dark,
        DROP COLUMN IF EXISTS favicon_path_dark,
        DROP COLUMN IF EXISTS watermark_path_dark,
        DROP COLUMN IF EXISTS text_crop_path_dark,
        DROP COLUMN IF EXISTS sub_mark_path_dark,
        DROP COLUMN IF EXISTS flash_line_path_dark,
        DROP COLUMN IF EXISTS hero_image_path_dark
    `);
  }
}
