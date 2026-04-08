import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddFingerprintToPositectorUploads1816600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE positector_uploads
      ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positector_uploads_fingerprint
      ON positector_uploads (company_id, fingerprint)
      WHERE fingerprint IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_positector_uploads_fingerprint");
    await queryRunner.query("ALTER TABLE positector_uploads DROP COLUMN IF EXISTS fingerprint");
  }
}
