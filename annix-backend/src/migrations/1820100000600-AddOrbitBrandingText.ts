import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrbitBrandingText1820100000600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE annix_orbit_branding
        ADD COLUMN IF NOT EXISTS tagline VARCHAR(200) NOT NULL
          DEFAULT 'Hiring • Talent • Compliance',
        ADD COLUMN IF NOT EXISTS description TEXT NOT NULL
          DEFAULT 'The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.',
        ADD COLUMN IF NOT EXISTS logo_lockup_path VARCHAR(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE annix_orbit_branding
        DROP COLUMN IF EXISTS tagline,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS logo_lockup_path
    `);
  }
}
