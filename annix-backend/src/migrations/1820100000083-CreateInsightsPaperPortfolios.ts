import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInsightsPaperPortfolios1820100000083 implements MigrationInterface {
  name = "CreateInsightsPaperPortfolios1820100000083";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_paper_portfolios" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(64) NOT NULL,
        "display_name" varchar(128) NOT NULL,
        "starting_capital" numeric(18, 2) NOT NULL,
        "monthly_contribution" numeric(18, 2) NOT NULL DEFAULT 5000,
        "currency" varchar(8) NOT NULL DEFAULT 'ZAR',
        "risk_profile" varchar(32) NOT NULL,
        "current_cash_balance" numeric(18, 2) NOT NULL,
        "current_portfolio_value" numeric(18, 2) NOT NULL DEFAULT 0,
        "allocation_rules_json" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_paused" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_paper_portfolios" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_insights_paper_portfolios_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_paper_holdings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "portfolio_id" uuid NOT NULL,
        "asset_id" uuid NOT NULL,
        "quantity" numeric(24, 8) NOT NULL,
        "average_buy_price" numeric(18, 6) NOT NULL,
        "current_price" numeric(18, 6) NOT NULL DEFAULT 0,
        "market_value" numeric(18, 2) NOT NULL DEFAULT 0,
        "unrealised_gain_loss" numeric(18, 2) NOT NULL DEFAULT 0,
        "unrealised_gain_loss_percent" numeric(9, 4) NOT NULL DEFAULT 0,
        "first_acquired_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_paper_holdings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_insights_paper_holdings_portfolio" FOREIGN KEY ("portfolio_id")
          REFERENCES "insights_paper_portfolios"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_insights_paper_holdings_asset" FOREIGN KEY ("asset_id")
          REFERENCES "insights_assets"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_insights_paper_holdings_portfolio_asset"
        ON "insights_paper_holdings" ("portfolio_id", "asset_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_paper_trades" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "portfolio_id" uuid NOT NULL,
        "asset_id" uuid,
        "action" varchar(16) NOT NULL,
        "quantity" numeric(24, 8) NOT NULL DEFAULT 0,
        "price" numeric(18, 6) NOT NULL DEFAULT 0,
        "trade_value" numeric(18, 2) NOT NULL DEFAULT 0,
        "fees" numeric(18, 2) NOT NULL DEFAULT 0,
        "app_reasoning" text NOT NULL DEFAULT '',
        "opportunity_score" numeric(6, 2),
        "risk_score" numeric(6, 2),
        "confidence_score" numeric(6, 2),
        "market_regime" varchar(64),
        "signal_snapshot" jsonb,
        "related_news_ids" text,
        "executed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_paper_trades" PRIMARY KEY ("id"),
        CONSTRAINT "FK_insights_paper_trades_portfolio" FOREIGN KEY ("portfolio_id")
          REFERENCES "insights_paper_portfolios"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_insights_paper_trades_asset" FOREIGN KEY ("asset_id")
          REFERENCES "insights_assets"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_insights_paper_trades_portfolio_executed_at"
        ON "insights_paper_trades" ("portfolio_id", "executed_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insights_paper_portfolio_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "portfolio_id" uuid NOT NULL,
        "snapshot_date" date NOT NULL,
        "total_value" numeric(18, 2) NOT NULL,
        "cash_balance" numeric(18, 2) NOT NULL,
        "invested_value" numeric(18, 2) NOT NULL,
        "daily_return_percent" numeric(9, 4) NOT NULL DEFAULT 0,
        "total_return_percent" numeric(9, 4) NOT NULL DEFAULT 0,
        "max_drawdown_percent" numeric(9, 4) NOT NULL DEFAULT 0,
        "volatility_score" numeric(9, 4) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_insights_paper_portfolio_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_insights_paper_portfolio_snapshots_portfolio" FOREIGN KEY ("portfolio_id")
          REFERENCES "insights_paper_portfolios"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_insights_paper_portfolio_snapshots_portfolio_date"
        ON "insights_paper_portfolio_snapshots" ("portfolio_id", "snapshot_date")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION insights_paper_trades_reject_update()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'insights_paper_trades is append-only; UPDATEs are forbidden';
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS insights_paper_trades_no_update_trg
        ON "insights_paper_trades"
    `);

    await queryRunner.query(`
      CREATE TRIGGER insights_paper_trades_no_update_trg
        BEFORE UPDATE ON "insights_paper_trades"
        FOR EACH ROW
        EXECUTE FUNCTION insights_paper_trades_reject_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS insights_paper_trades_no_update_trg
        ON "insights_paper_trades"
    `);
    await queryRunner.query("DROP FUNCTION IF EXISTS insights_paper_trades_reject_update()");
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_insights_paper_portfolio_snapshots_portfolio_date"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_paper_portfolio_snapshots"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_insights_paper_trades_portfolio_executed_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_paper_trades"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_insights_paper_holdings_portfolio_asset"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_paper_holdings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "insights_paper_portfolios"`);
  }
}
