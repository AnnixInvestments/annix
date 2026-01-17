import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecureDocumentTable1769600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE secure_document (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        storage_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50) NOT NULL DEFAULT 'markdown',
        original_filename VARCHAR(255),
        created_by_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_secure_document_user FOREIGN KEY (created_by_id) REFERENCES "user"(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_secure_document_created_by ON secure_document(created_by_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_secure_document_title ON secure_document(title)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_secure_document_title`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_secure_document_created_by`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS secure_document`);
  }
}
