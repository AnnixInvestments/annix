import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInsightsSignalSnapshots1820100000085 implements MigrationInterface {
  name = "CreateInsightsSignalSnapshots1820100000085";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_signal_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "snapshot_date" date NOT NULL,
        "momentum_score" numeric(6, 2) NOT NULL,
        "valuation_score" numeric(6, 2) NOT NULL,
        "news_sentiment_score" numeric(6, 2) NOT NULL,
        "sector_trend_score" numeric(6, 2) NOT NULL,
        "drawdown_risk_score" numeric(6, 2) NOT NULL,
        "opportunity_score" numeric(6, 2) NOT NULL,
        "risk_score" numeric(6, 2) NOT NULL,
        "confidence_score" numeric(6, 2) NOT NULL,
        "component_breakdown_json" jsonb NOT NULL,
        "market_regime" varchar(32) NOT NULL DEFAULT 'unknown',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_signal_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_insights_signal_snapshots_asset"
          FOREIGN KEY ("asset_id") REFERENCES "insights_assets"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_insights_signal_snapshots_asset_date"
        ON "insights_signal_snapshots" ("asset_id", "snapshot_date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_signal_snapshots_date"
        ON "insights_signal_snapshots" ("snapshot_date")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION insights_signal_snapshots_reject_update()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'insights_signal_snapshots is append-only; UPDATEs are forbidden';
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS insights_signal_snapshots_no_update_trg
        ON "insights_signal_snapshots"
    `);

    await queryRunner.query(`
      CREATE TRIGGER insights_signal_snapshots_no_update_trg
        BEFORE UPDATE ON "insights_signal_snapshots"
        FOR EACH ROW
        EXECUTE FUNCTION insights_signal_snapshots_reject_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS insights_signal_snapshots_no_update_trg
        ON "insights_signal_snapshots"
    `);
    await queryRunner.query("DROP FUNCTION IF EXISTS insights_signal_snapshots_reject_update()");
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_insights_signal_snapshots_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_insights_signal_snapshots_asset_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_signal_snapshots"`);
  }
}
