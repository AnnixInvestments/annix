import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Folds the Orbit-specific annix_orbit_branding table into the brand-keyed
 * app_branding table (single source of truth), preserving any admin edits made
 * on the old table, then drops it.
 */
export class ConsolidateOrbitBrandingIntoAppBranding1820100000800 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOld = await queryRunner.hasTable("annix_orbit_branding");
    if (hasOld) {
      await queryRunner.query(`
        UPDATE app_branding ab SET
          navbar_color = ob.navbar_color,
          accent_orange = ob.accent_orange,
          accent_orange_light = ob.accent_orange_light,
          accent_orange_dark = ob.accent_orange_dark,
          gradient_from = ob.gradient_from,
          gradient_via = ob.gradient_via,
          gradient_to = ob.gradient_to,
          tagline = ob.tagline,
          description = ob.description,
          logo_icon_path = ob.logo_icon_path,
          logo_lockup_path = ob.logo_lockup_path,
          wordmark_path = ob.wordmark_path,
          favicon_path = ob.favicon_path,
          watermark_path = ob.watermark_path,
          watermark_enabled = ob.watermark_enabled,
          watermark_opacity = ob.watermark_opacity,
          watermark_max_size_px = ob.watermark_max_size_px,
          updated_at = CURRENT_TIMESTAMP
        FROM annix_orbit_branding ob
        WHERE ab.brand_code = 'annix-orbit' AND ob.id = 1
      `);
      await queryRunner.query("DROP TABLE IF EXISTS annix_orbit_branding");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS annix_orbit_branding (
        id INTEGER PRIMARY KEY DEFAULT 1,
        navbar_color VARCHAR(9) NOT NULL DEFAULT '#323288',
        accent_orange VARCHAR(9) NOT NULL DEFAULT '#FF8A00',
        accent_orange_light VARCHAR(9) NOT NULL DEFAULT '#FF9C33',
        accent_orange_dark VARCHAR(9) NOT NULL DEFAULT '#CC6900',
        gradient_from VARCHAR(9) NOT NULL DEFAULT '#1a1a40',
        gradient_via VARCHAR(9) NOT NULL DEFAULT '#0d0d20',
        gradient_to VARCHAR(9) NOT NULL DEFAULT '#1a1a40',
        tagline VARCHAR(200) NOT NULL DEFAULT 'Hiring • Talent • Compliance',
        description TEXT NOT NULL DEFAULT '',
        logo_icon_path VARCHAR(500) NULL,
        logo_lockup_path VARCHAR(500) NULL,
        wordmark_path VARCHAR(500) NULL,
        favicon_path VARCHAR(500) NULL,
        watermark_path VARCHAR(500) NULL,
        watermark_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        watermark_opacity DOUBLE PRECISION NOT NULL DEFAULT 0.1,
        watermark_max_size_px INTEGER NOT NULL DEFAULT 880,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_annix_orbit_branding_singleton CHECK (id = 1)
      )
    `);
    await queryRunner.query(`
      INSERT INTO annix_orbit_branding (
        id, navbar_color, accent_orange, accent_orange_light, accent_orange_dark,
        gradient_from, gradient_via, gradient_to, tagline, description,
        logo_icon_path, logo_lockup_path, wordmark_path, favicon_path, watermark_path,
        watermark_enabled, watermark_opacity, watermark_max_size_px
      )
      SELECT
        1, navbar_color, accent_orange, accent_orange_light, accent_orange_dark,
        gradient_from, gradient_via, gradient_to, tagline, description,
        logo_icon_path, logo_lockup_path, wordmark_path, favicon_path, watermark_path,
        watermark_enabled, watermark_opacity, watermark_max_size_px
      FROM app_branding WHERE brand_code = 'annix-orbit'
      ON CONFLICT (id) DO NOTHING
    `);
  }
}
