import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackTables1771000000000 implements MigrationInterface {
  name = "AddFeedbackTables1771000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
      ADD COLUMN "github_feedback_issue_number" integer NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_feedback" (
        "id" SERIAL NOT NULL,
        "customer_profile_id" integer NOT NULL,
        "github_issue_number" integer NULL,
        "content" text NOT NULL,
        "source" character varying(10) NOT NULL DEFAULT 'text',
        "page_url" character varying(500) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_feedback" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_feedback"
      ADD CONSTRAINT "FK_customer_feedback_customer_profile"
      FOREIGN KEY ("customer_profile_id")
      REFERENCES "customer_profiles"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_feedback_customer_profile"
      ON "customer_feedback"("customer_profile_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_feedback_github_issue"
      ON "customer_feedback"("github_issue_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_customer_feedback_github_issue"`);
    await queryRunner.query(`DROP INDEX "IDX_customer_feedback_customer_profile"`);
    await queryRunner.query(
      `ALTER TABLE "customer_feedback" DROP CONSTRAINT "FK_customer_feedback_customer_profile"`,
    );
    await queryRunner.query(`DROP TABLE "customer_feedback"`);
    await queryRunner.query(
      `ALTER TABLE "customer_profiles" DROP COLUMN "github_feedback_issue_number"`,
    );
  }
}
