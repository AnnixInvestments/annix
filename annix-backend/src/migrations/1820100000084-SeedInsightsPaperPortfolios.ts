import type { MigrationInterface, QueryRunner } from "typeorm";

interface SeedPortfolio {
  slug: string;
  displayName: string;
  riskProfile: string;
  allocationRules: Record<string, unknown>;
}

const STARTING_CAPITAL = 100000;
const MONTHLY_CONTRIBUTION = 5000;

const SEED_PORTFOLIOS: SeedPortfolio[] = [
  {
    slug: "benchmark-spy",
    displayName: "Benchmark · S&P 500",
    riskProfile: "buy-and-hold",
    allocationRules: {
      maxPositions: 1,
      maxPercentPerPosition: 100,
      maxPercentPerSector: null,
      cashFloorPercent: 0,
      confidenceFloor: 0,
      fixedHolding: { symbol: "SPY" },
    },
  },
  {
    slug: "benchmark-jse40",
    displayName: "Benchmark · JSE Top 40",
    riskProfile: "buy-and-hold",
    allocationRules: {
      maxPositions: 1,
      maxPercentPerPosition: 100,
      maxPercentPerSector: null,
      cashFloorPercent: 0,
      confidenceFloor: 0,
      fixedHolding: { symbol: "STX40.JO" },
    },
  },
  {
    slug: "signal-conservative",
    displayName: "Signal · Conservative",
    riskProfile: "conservative",
    allocationRules: {
      maxPositions: 10,
      maxPercentPerPosition: 5,
      maxPercentPerSector: 25,
      cashFloorPercent: 30,
      confidenceFloor: 70,
    },
  },
  {
    slug: "signal-balanced",
    displayName: "Signal · Balanced",
    riskProfile: "balanced",
    allocationRules: {
      maxPositions: 15,
      maxPercentPerPosition: 8,
      maxPercentPerSector: 35,
      cashFloorPercent: 10,
      confidenceFloor: 60,
    },
  },
  {
    slug: "signal-commodity-tilt",
    displayName: "Signal · Commodity Tilt",
    riskProfile: "commodity-tilt",
    allocationRules: {
      maxPositions: 12,
      maxPercentPerPosition: 10,
      maxPercentPerSector: 30,
      cashFloorPercent: 5,
      confidenceFloor: 60,
      sectorTilt: {
        sectors: [
          "Diversified Mining",
          "PGM Mining",
          "Copper Mining",
          "Gold Miners (2x)",
          "Precious Metals",
          "Uranium",
          "Energy",
          "Industrials",
          "Agriculture",
        ],
        bonus: 10,
      },
    },
  },
  {
    slug: "signal-very-high-risk",
    displayName: "Signal · Very High Risk",
    riskProfile: "very-high-risk",
    allocationRules: {
      maxPositions: 5,
      maxPercentPerPosition: 30,
      maxPercentPerSector: null,
      cashFloorPercent: 0,
      confidenceFloor: 50,
      preferLeveragedEtfs: true,
    },
  },
];

export class SeedInsightsPaperPortfolios1820100000084 implements MigrationInterface {
  name = "SeedInsightsPaperPortfolios1820100000084";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const portfolio of SEED_PORTFOLIOS) {
      await queryRunner.query(
        `INSERT INTO "insights_paper_portfolios" (
          "slug", "display_name", "starting_capital", "monthly_contribution",
          "currency", "risk_profile", "current_cash_balance",
          "current_portfolio_value", "allocation_rules_json"
        )
        VALUES ($1, $2, $3, $4, 'ZAR', $5, $6, 0, $7)
        ON CONFLICT ("slug") DO NOTHING`,
        [
          portfolio.slug,
          portfolio.displayName,
          STARTING_CAPITAL,
          MONTHLY_CONTRIBUTION,
          portfolio.riskProfile,
          STARTING_CAPITAL,
          JSON.stringify(portfolio.allocationRules),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const slugs = SEED_PORTFOLIOS.map((p) => p.slug);
    await queryRunner.query(
      `DELETE FROM "insights_paper_portfolios" WHERE "slug" = ANY($1::text[])`,
      [slugs],
    );
  }
}
