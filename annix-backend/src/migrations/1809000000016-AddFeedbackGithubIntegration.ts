import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackGithubIntegration1809000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS github_issue_number INT
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS ai_classification VARCHAR(30)
    `);

    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE customer_feedback DROP COLUMN IF EXISTS github_issue_number",
    );
    await queryRunner.query(
      "ALTER TABLE customer_feedback DROP COLUMN IF EXISTS ai_classification",
    );
    await queryRunner.query("ALTER TABLE customer_feedback DROP COLUMN IF EXISTS status");
  }
}
