import type { MigrationInterface, QueryRunner } from "typeorm";

interface SeedRow {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  assetType: string;
  sector: string | null;
  targetReason: string;
}

const SEED_ROWS: SeedRow[] = [
  {
    symbol: "AGL.JO",
    name: "Anglo American",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Diversified Mining",
    targetReason: "Core SA diversified miner; high commodity-cycle beta.",
  },
  {
    symbol: "BHG.JO",
    name: "BHP Group",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Diversified Mining",
    targetReason: "Global diversified miner with JSE secondary listing.",
  },
  {
    symbol: "IMP.JO",
    name: "Impala Platinum",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "PGM Mining",
    targetReason: "Platinum-group metals exposure; auto-catalyst cycle.",
  },
  {
    symbol: "AMS.JO",
    name: "Anglo American Platinum",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "PGM Mining",
    targetReason: "PGM miner with higher-quality assets than IMP.",
  },
  {
    symbol: "SBK.JO",
    name: "Standard Bank",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Banking",
    targetReason: "Largest SA bank by assets; rate-cycle proxy.",
  },
  {
    symbol: "FSR.JO",
    name: "FirstRand",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Banking",
    targetReason: "Best-run SA bank historically.",
  },
  {
    symbol: "NPN.JO",
    name: "Naspers",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Technology",
    targetReason: "SA tech holding company with global tech exposure.",
  },
  {
    symbol: "MTN.JO",
    name: "MTN Group",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Telecoms",
    targetReason: "Pan-African telco; EM currency and political risk.",
  },
  {
    symbol: "SOL.JO",
    name: "Sasol",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Energy",
    targetReason: "Energy/chemicals; oil-price and ZAR sensitivity.",
  },
  {
    symbol: "SHP.JO",
    name: "Shoprite Holdings",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "stock",
    sector: "Consumer Staples",
    targetReason: "SA consumer defensive — food retail.",
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    exchange: "NYSE",
    currency: "USD",
    assetType: "etf",
    sector: "US Equity",
    targetReason: "Paper-portfolio 1 benchmark — buy-and-hold US large-cap.",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "etf",
    sector: "US Tech",
    targetReason: "US large-cap tech exposure.",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "stock",
    sector: "Technology",
    targetReason: "US mega-cap tech reference.",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "stock",
    sector: "Technology",
    targetReason: "AI-cycle proxy + enterprise software.",
  },
  {
    symbol: "NVDA",
    name: "Nvidia",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "stock",
    sector: "Semiconductors",
    targetReason: "AI-cycle leader; very high volatility.",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "stock",
    sector: "Consumer Discretionary",
    targetReason: "E-commerce + AWS exposure.",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "stock",
    sector: "Technology",
    targetReason: "Search advertising + Google Cloud.",
  },
  {
    symbol: "XLE",
    name: "Energy Select Sector SPDR",
    exchange: "NYSE",
    currency: "USD",
    assetType: "etf",
    sector: "Energy",
    targetReason: "US energy sector — oil-price proxy.",
  },
  {
    symbol: "XLF",
    name: "Financial Select Sector SPDR",
    exchange: "NYSE",
    currency: "USD",
    assetType: "etf",
    sector: "Financials",
    targetReason: "US financials — rates-cycle proxy.",
  },
  {
    symbol: "XLI",
    name: "Industrial Select Sector SPDR",
    exchange: "NYSE",
    currency: "USD",
    assetType: "etf",
    sector: "Industrials",
    targetReason: "US industrials — manufacturing cycle.",
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Trust",
    exchange: "NYSE",
    currency: "USD",
    assetType: "commodity",
    sector: "Precious Metals",
    targetReason: "Gold price proxy; macro hedge.",
  },
  {
    symbol: "SLV",
    name: "iShares Silver Trust",
    exchange: "NYSE",
    currency: "USD",
    assetType: "commodity",
    sector: "Precious Metals",
    targetReason: "Silver price proxy; higher beta than gold.",
  },
  {
    symbol: "URA",
    name: "Global X Uranium ETF",
    exchange: "NYSE",
    currency: "USD",
    assetType: "etf",
    sector: "Uranium",
    targetReason: "Nuclear renaissance thesis basket.",
  },
  {
    symbol: "COPX",
    name: "Global X Copper Miners ETF",
    exchange: "NYSE",
    currency: "USD",
    assetType: "etf",
    sector: "Copper Mining",
    targetReason: "Electrification thesis basket.",
  },
  {
    symbol: "DBA",
    name: "Invesco DB Agriculture Fund",
    exchange: "NYSE",
    currency: "USD",
    assetType: "commodity",
    sector: "Agriculture",
    targetReason: "Soft commodity basket — food inflation hedge.",
  },
  {
    symbol: "TQQQ",
    name: "ProShares UltraPro QQQ",
    exchange: "NASDAQ",
    currency: "USD",
    assetType: "leveraged_etf",
    sector: "US Tech (3x)",
    targetReason: "Very-high-risk paper-portfolio fodder — 3x leveraged Nasdaq.",
  },
  {
    symbol: "SOXL",
    name: "Direxion Daily Semiconductor Bull 3x Shares",
    exchange: "NYSE",
    currency: "USD",
    assetType: "leveraged_etf",
    sector: "Semiconductors (3x)",
    targetReason: "Very-high-risk paper-portfolio fodder — 3x leveraged semis.",
  },
  {
    symbol: "NUGT",
    name: "Direxion Daily Gold Miners Index Bull 2x Shares",
    exchange: "NYSE",
    currency: "USD",
    assetType: "leveraged_etf",
    sector: "Gold Miners (2x)",
    targetReason: "Very-high-risk paper-portfolio fodder — 2x leveraged gold miners.",
  },
  {
    symbol: "STX40.JO",
    name: "Satrix 40 ETF",
    exchange: "JSE",
    currency: "ZAR",
    assetType: "etf",
    sector: "SA Equity",
    targetReason: "Paper-portfolio 2 benchmark — JSE Top 40 ETF.",
  },
  {
    symbol: "^J200",
    name: "FTSE/JSE Top 40 Index",
    exchange: "INDEX",
    currency: "ZAR",
    assetType: "index",
    sector: "SA Equity",
    targetReason: "JSE Top 40 raw index — underlying for STX40.",
  },
];

export class SeedInsightsInitialWatchlist1820100000081 implements MigrationInterface {
  name = "SeedInsightsInitialWatchlist1820100000081";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const row of SEED_ROWS) {
      const inserted = await queryRunner.query(
        `INSERT INTO "insights_assets" ("symbol", "name", "exchange", "currency", "asset_type", "sector")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("symbol") DO NOTHING
         RETURNING id`,
        [row.symbol, row.name, row.exchange, row.currency, row.assetType, row.sector],
      );

      let assetId: string;
      if (inserted.length > 0) {
        assetId = inserted[0].id;
      } else {
        const existing = await queryRunner.query(
          `SELECT id FROM "insights_assets" WHERE "symbol" = $1`,
          [row.symbol],
        );
        if (existing.length === 0) continue;
        assetId = existing[0].id;
      }

      await queryRunner.query(
        `INSERT INTO "insights_watchlist_items" ("asset_id", "target_reason")
         VALUES ($1, $2)
         ON CONFLICT ("asset_id") DO NOTHING`,
        [assetId, row.targetReason],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const symbols = SEED_ROWS.map((r) => r.symbol);
    await queryRunner.query(
      `DELETE FROM "insights_watchlist_items"
       WHERE "asset_id" IN (
         SELECT id FROM "insights_assets" WHERE "symbol" = ANY($1::text[])
       )`,
      [symbols],
    );
    await queryRunner.query(`DELETE FROM "insights_assets" WHERE "symbol" = ANY($1::text[])`, [
      symbols,
    ]);
  }
}
