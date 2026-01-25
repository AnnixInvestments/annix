import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugToSecureDocument1769700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE secure_document
      ADD COLUMN slug VARCHAR(255)
    `);

    await queryRunner.query(`
      UPDATE secure_document
      SET slug = LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(title, '[^a-zA-Z0-9\\s-]', '', 'g'),
          '\\s+',
          '-',
          'g'
        )
      )
    `);

    await queryRunner.query(`
      ALTER TABLE secure_document
      ALTER COLUMN slug SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE secure_document
      ADD CONSTRAINT uq_secure_document_slug UNIQUE (slug)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_secure_document_slug ON secure_document(slug)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_secure_document_slug`);
    await queryRunner.query(
      `ALTER TABLE secure_document DROP CONSTRAINT IF EXISTS uq_secure_document_slug`,
    );
    await queryRunner.query(
      `ALTER TABLE secure_document DROP COLUMN IF EXISTS slug`,
    );
  }
}
