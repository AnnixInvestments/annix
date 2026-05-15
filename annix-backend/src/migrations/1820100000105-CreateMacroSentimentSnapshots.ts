import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMacroSentimentSnapshots1820100000105 implements MigrationInterface {
  name = "CreateMacroSentimentSnapshots1820100000105";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_macro_sentiment_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "snapshot_date" date NOT NULL,
        "overall_score" numeric(6,4) NOT NULL DEFAULT 0,
        "article_count" integer NOT NULL DEFAULT 0,
        "high_impact_count" integer NOT NULL DEFAULT 0,
        "sector_breakdown" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "commodity_breakdown" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_macro_sentiment_snapshots" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_insights_macro_sentiment_snapshots_date"
      ON "insights_macro_sentiment_snapshots" ("snapshot_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_macro_sentiment_snapshots"`);
  }
}
