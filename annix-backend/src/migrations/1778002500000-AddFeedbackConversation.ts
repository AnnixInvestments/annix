import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackConversation1778002500000 implements MigrationInterface {
  name = "AddFeedbackConversation1778002500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."related_entity_type_enum" ADD VALUE IF NOT EXISTS 'FEEDBACK'`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" ADD COLUMN IF NOT EXISTS "conversation_id" integer`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" ADD COLUMN IF NOT EXISTS "assigned_to_id" integer`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" DROP COLUMN IF EXISTS "github_issue_number"`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "customer_feedback" ADD CONSTRAINT "FK_customer_feedback_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "customer_feedback" ADD CONSTRAINT "FK_customer_feedback_assigned_to" FOREIGN KEY ("assigned_to_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_feedback" DROP CONSTRAINT IF EXISTS "FK_customer_feedback_assigned_to"`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" DROP CONSTRAINT IF EXISTS "FK_customer_feedback_conversation"`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" DROP COLUMN IF EXISTS "assigned_to_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" DROP COLUMN IF EXISTS "conversation_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "customer_feedback" ADD COLUMN IF NOT EXISTS "github_issue_number" integer`,
    );
  }
}
