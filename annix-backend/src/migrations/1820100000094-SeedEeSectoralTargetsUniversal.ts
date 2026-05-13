import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Seeds the universal 3% workforce disability target from the
 * Employment Equity Amendment Act 2022 + the January 2025 sectoral
 * targets gazette (GG 50162, 15 Jan 2025).
 *
 * This target applies ACROSS all 18 economic sectors at the
 * `all_levels` occupational level and is the only one that is genuinely
 * universal — the per-sector race + female targets vary by sector x
 * occupational level and must be transcribed from the gazette tables
 * before activation. Use the admin endpoint
 * `POST /admin/cv-assistant/ee-sectoral-targets` to add the remaining
 * 18 sectors x 4 levels x 4 metrics ~= 288 rows.
 *
 * Sector code "all" is a convention: ee-report.service.ts falls back to
 * "all" when no sector-specific target exists for the company's sector.
 */
export class SeedEeSectoralTargetsUniversal1820100000094 implements MigrationInterface {
  name = "SeedEeSectoralTargetsUniversal1820100000094";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "cv_assistant_ee_sectoral_targets"
        ("sector_code", "occupational_level", "target_year", "target_metric", "target_percent", "gazette_reference")
      VALUES
        ('all', 'all_levels', 2030, 'disability', 3.00, 'GG 50162, 15 Jan 2025 (EE Amendment Act 2022, universal disability target)')
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "cv_assistant_ee_sectoral_targets"
      WHERE sector_code = 'all'
        AND occupational_level = 'all_levels'
        AND target_metric = 'disability'
        AND target_year = 2030
    `);
  }
}
