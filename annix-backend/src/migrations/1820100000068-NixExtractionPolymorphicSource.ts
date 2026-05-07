import type { MigrationInterface, QueryRunner } from "typeorm";

export class NixExtractionPolymorphicSource1820100000068 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nix_extractions
      ADD COLUMN IF NOT EXISTS source_module VARCHAR(64) NULL,
      ADD COLUMN IF NOT EXISTS source_id INTEGER NULL,
      ADD COLUMN IF NOT EXISTS extraction_profile VARCHAR(64) NULL;
    `);

    await queryRunner.query(`
      UPDATE nix_extractions
      SET source_module = 'rfq',
          source_id = rfq_id,
          extraction_profile = COALESCE(extraction_profile, 'rfq-piping')
      WHERE rfq_id IS NOT NULL
        AND source_module IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_extractions_source
        ON nix_extractions (source_module, source_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_extractions_profile
        ON nix_extractions (extraction_profile);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_extractions_profile;");
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_extractions_source;");
    await queryRunner.query(`
      ALTER TABLE nix_extractions
      DROP COLUMN IF EXISTS extraction_profile,
      DROP COLUMN IF EXISTS source_id,
      DROP COLUMN IF EXISTS source_module;
    `);
  }
}
