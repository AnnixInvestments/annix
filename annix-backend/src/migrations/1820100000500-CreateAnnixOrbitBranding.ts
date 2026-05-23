import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnnixOrbitBranding1820100000500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
        logo_icon_path VARCHAR(500) NULL,
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
      INSERT INTO annix_orbit_branding (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS annix_orbit_branding");
  }
}
