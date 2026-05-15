import type { MigrationInterface, QueryRunner } from "typeorm";

const STARTING_CAPITAL = 100000;
const MONTHLY_CONTRIBUTION = 5000;

const ALLOCATION_RULES = {
  maxPositions: 12,
  maxPercentPerPosition: 10,
  maxPercentPerSector: 35,
  cashFloorPercent: 10,
  confidenceFloor: 60,
};

export class SeedNixHybridPortfolio1820100000102 implements MigrationInterface {
  name = "SeedNixHybridPortfolio1820100000102";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "insights_paper_portfolios" (
        "slug", "display_name", "starting_capital", "monthly_contribution",
        "currency", "risk_profile", "current_cash_balance",
        "current_portfolio_value", "allocation_rules_json", "executor_strategy"
      )
      VALUES ($1, $2, $3, $4, 'ZAR', 'balanced', $5, 0, $6, 'ai-override')
      ON CONFLICT ("slug") DO NOTHING`,
      [
        "nix-hybrid",
        "Nix · Hybrid",
        STARTING_CAPITAL,
        MONTHLY_CONTRIBUTION,
        STARTING_CAPITAL,
        JSON.stringify(ALLOCATION_RULES),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "insights_paper_portfolios" WHERE "slug" = 'nix-hybrid'`);
  }
}
