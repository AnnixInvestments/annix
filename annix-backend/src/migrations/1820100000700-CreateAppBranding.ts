import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAppBranding1820100000700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_branding (
        brand_code VARCHAR(64) PRIMARY KEY,
        navbar_color VARCHAR(9) NOT NULL DEFAULT '#323288',
        accent_orange VARCHAR(9) NOT NULL DEFAULT '#FF8A00',
        accent_orange_light VARCHAR(9) NOT NULL DEFAULT '#FF9C33',
        accent_orange_dark VARCHAR(9) NOT NULL DEFAULT '#CC6900',
        gradient_from VARCHAR(9) NOT NULL DEFAULT '#1a1a40',
        gradient_via VARCHAR(9) NOT NULL DEFAULT '#0d0d20',
        gradient_to VARCHAR(9) NOT NULL DEFAULT '#1a1a40',
        tagline VARCHAR(200) NOT NULL DEFAULT '',
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Carry over Annix Orbit's current branding (incl any admin customisations)
    // from its dedicated table so nothing changes when Orbit starts reading here.
    await queryRunner.query(`
      INSERT INTO app_branding (
        brand_code, navbar_color, accent_orange, accent_orange_light, accent_orange_dark,
        gradient_from, gradient_via, gradient_to, tagline, description,
        logo_icon_path, logo_lockup_path, wordmark_path, favicon_path, watermark_path,
        watermark_enabled, watermark_opacity, watermark_max_size_px
      )
      SELECT
        'annix-orbit', navbar_color, accent_orange, accent_orange_light, accent_orange_dark,
        gradient_from, gradient_via, gradient_to, tagline, description,
        logo_icon_path, logo_lockup_path, wordmark_path, favicon_path, watermark_path,
        watermark_enabled, watermark_opacity, watermark_max_size_px
      FROM annix_orbit_branding
      WHERE id = 1
      ON CONFLICT (brand_code) DO NOTHING
    `);

    // Fallback Orbit row if the dedicated table was somehow empty.
    await queryRunner.query(`
      INSERT INTO app_branding (brand_code, tagline, description)
      VALUES ('annix-orbit', 'Hiring • Talent • Compliance',
        'The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.')
      ON CONFLICT (brand_code) DO NOTHING
    `);

    // Seed the remaining brands with platform defaults; admins customise via the UI.
    await queryRunner.query(`
      INSERT INTO app_branding (brand_code, tagline, description) VALUES
        ('annix-investments', '', 'Annix Investments — the Annix holding company.'),
        ('annix-insights', '', 'Market data, news signals, and AI-driven portfolio insights.'),
        ('annix-rep', '', 'Mobile sales assistant with smart prospecting and route planning.'),
        ('comply-sa', '', 'SA SME compliance — B-BBEE, tax tools, and regulatory tracking.')
      ON CONFLICT (brand_code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS app_branding");
  }
}
