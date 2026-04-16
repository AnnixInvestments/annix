import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackReliabilityFields1809100000000 implements MigrationInterface {
  name = "AddFeedbackReliabilityFields1809100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_feedback"
      ADD COLUMN "translator_confidence" double precision NULL,
      ADD COLUMN "translator_likely_location" character varying(255) NULL,
      ADD COLUMN "translator_likely_cause" text NULL,
      ADD COLUMN "translator_affected_surface" character varying(255) NULL,
      ADD COLUMN "translator_fix_scope" character varying(100) NULL,
      ADD COLUMN "translator_auto_fixable" boolean NULL,
      ADD COLUMN "translator_risk_flags" jsonb NULL,
      ADD COLUMN "translator_reproduction_steps" jsonb NULL,
      ADD COLUMN "capture_completeness_score" double precision NULL,
      ADD COLUMN "capture_context" jsonb NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_feedback"
      DROP COLUMN "capture_context",
      DROP COLUMN "capture_completeness_score",
      DROP COLUMN "translator_reproduction_steps",
      DROP COLUMN "translator_risk_flags",
      DROP COLUMN "translator_auto_fixable",
      DROP COLUMN "translator_fix_scope",
      DROP COLUMN "translator_affected_surface",
      DROP COLUMN "translator_likely_cause",
      DROP COLUMN "translator_likely_location",
      DROP COLUMN "translator_confidence"
    `);
  }
}
