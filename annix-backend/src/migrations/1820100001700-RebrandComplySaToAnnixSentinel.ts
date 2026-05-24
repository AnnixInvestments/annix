import { MigrationInterface, QueryRunner } from "typeorm";

export class RebrandComplySaToAnnixSentinel1820100001700 implements MigrationInterface {
  name = "RebrandComplySaToAnnixSentinel1820100001700";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO app_branding (
        brand_code, navbar_color, accent_orange, accent_orange_light, accent_orange_dark,
        gradient_from, gradient_via, gradient_to, tagline, description
      ) VALUES (
        'comply-sa', '#0A1B3D', '#1E90FF', '#4FA8FF', '#1565C0',
        '#0A1B3D', '#06101F', '#0A1B3D',
        'AI-Powered Compliance & Risk Intelligence',
        'Annix Sentinel is your AI-powered compliance operating system that monitors, protects, and strengthens your business against risk and regulatory non-compliance.'
      )
      ON CONFLICT (brand_code) DO UPDATE SET
        navbar_color = EXCLUDED.navbar_color,
        accent_orange = EXCLUDED.accent_orange,
        accent_orange_light = EXCLUDED.accent_orange_light,
        accent_orange_dark = EXCLUDED.accent_orange_dark,
        gradient_from = EXCLUDED.gradient_from,
        gradient_via = EXCLUDED.gradient_via,
        gradient_to = EXCLUDED.gradient_to,
        tagline = EXCLUDED.tagline,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
    `);

    await queryRunner.query(
      `UPDATE "apps"
       SET "name" = $1, "description" = $2
       WHERE "code" = 'comply-sa'`,
      [
        "Annix Sentinel",
        "AI-powered compliance operating system that monitors, protects, and strengthens SA businesses against risk and regulatory non-compliance.",
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE app_branding SET
        navbar_color = '#323288',
        accent_orange = '#FF8A00',
        accent_orange_light = '#FF9C33',
        accent_orange_dark = '#CC6900',
        gradient_from = '#1a1a40',
        gradient_via = '#0d0d20',
        gradient_to = '#1a1a40',
        tagline = '',
        description = 'SA SME compliance — B-BBEE, tax tools, and regulatory tracking.',
        updated_at = CURRENT_TIMESTAMP
      WHERE brand_code = 'comply-sa'
    `);

    await queryRunner.query(
      `UPDATE "apps"
       SET "name" = $1, "description" = $2
       WHERE "code" = 'comply-sa'`,
      [
        "Comply SA",
        "SA SME compliance dashboard with B-BBEE, tax tools, document templates, and regulatory tracking",
      ],
    );
  }
}
