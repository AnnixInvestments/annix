import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackAttachments1809000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS feedback_attachment (
        id SERIAL PRIMARY KEY,
        feedback_id INT NOT NULL REFERENCES customer_feedback(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        is_auto_screenshot BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_attachment_feedback_id
      ON feedback_attachment(feedback_id)
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS submitter_type VARCHAR(30)
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(200)
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255)
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS app_context VARCHAR(50)
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ALTER COLUMN customer_profile_id DROP NOT NULL
    `);

    await queryRunner.query(`
      UPDATE customer_feedback
      SET submitter_type = 'customer'
      WHERE submitter_type IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS feedback_attachment");
    await queryRunner.query("ALTER TABLE customer_feedback DROP COLUMN IF EXISTS submitter_type");
    await queryRunner.query("ALTER TABLE customer_feedback DROP COLUMN IF EXISTS submitter_name");
    await queryRunner.query("ALTER TABLE customer_feedback DROP COLUMN IF EXISTS submitter_email");
    await queryRunner.query("ALTER TABLE customer_feedback DROP COLUMN IF EXISTS app_context");
  }
}
