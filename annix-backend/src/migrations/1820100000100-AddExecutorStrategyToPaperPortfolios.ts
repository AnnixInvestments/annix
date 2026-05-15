import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExecutorStrategyToPaperPortfolios1820100000100 implements MigrationInterface {
  name = "AddExecutorStrategyToPaperPortfolios1820100000100";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_paper_portfolios"
      ADD COLUMN IF NOT EXISTS "executor_strategy" varchar(32) NOT NULL DEFAULT 'rules'
    `);

    await queryRunner.query(`
      UPDATE "insights_paper_portfolios"
      SET "executor_strategy" = 'buy-and-hold'
      WHERE "risk_profile" = 'buy-and-hold'
         OR ("allocation_rules_json"::jsonb ->> 'fixedHolding') IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_paper_portfolios"
      DROP COLUMN IF EXISTS "executor_strategy"
    `);
  }
}
