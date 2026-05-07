import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds document_role to nix_extractions so the AI extraction pipeline can
 * distinguish drawings from specifications without relying on filename
 * heuristics. Drives:
 *   - role-specific system prompts (drawings → item extraction;
 *     specifications → clause extraction)
 *   - drawings-first ordering for cross-document linking (#253 task B)
 *
 * Followup to #251 stage 4 — see #253 task D.
 */
export class AddDocumentRoleToNixExtractions1820100000069 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nix_extractions
      ADD COLUMN IF NOT EXISTS document_role VARCHAR(32) NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_extractions_role
        ON nix_extractions (document_role);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_extractions_role;");
    await queryRunner.query(`
      ALTER TABLE nix_extractions
      DROP COLUMN IF EXISTS document_role;
    `);
  }
}
