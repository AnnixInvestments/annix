import { AppDataSource } from "../src/config/data-source";

const SLUG = "nix-pure";

async function resetNixPure(): Promise<void> {
  console.log("Connecting to database...");
  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (manager) => {
      const portfolios = await manager.query(
        `SELECT id, slug, starting_capital, current_cash_balance, current_portfolio_value
         FROM insights_paper_portfolios WHERE slug = $1`,
        [SLUG],
      );
      if (portfolios.length === 0) {
        throw new Error(`No portfolio found with slug "${SLUG}" — nothing to reset.`);
      }
      const portfolio = portfolios[0];
      const portfolioId = portfolio.id;
      console.log(`Found ${SLUG} (${portfolioId})`);
      console.log(
        `  before: cash ${portfolio.current_cash_balance}, value ${portfolio.current_portfolio_value}`,
      );

      const holdingCount = await manager.query(
        "SELECT COUNT(*)::int AS n FROM insights_paper_holdings WHERE portfolio_id = $1",
        [portfolioId],
      );
      const tradeCount = await manager.query(
        "SELECT COUNT(*)::int AS n FROM insights_paper_trades WHERE portfolio_id = $1",
        [portfolioId],
      );
      const snapshotCount = await manager.query(
        "SELECT COUNT(*)::int AS n FROM insights_paper_portfolio_snapshots WHERE portfolio_id = $1",
        [portfolioId],
      );
      console.log(
        `  clearing: ${holdingCount[0].n} holdings, ${tradeCount[0].n} trades, ${snapshotCount[0].n} snapshots`,
      );

      await manager.query("DELETE FROM insights_paper_holdings WHERE portfolio_id = $1", [
        portfolioId,
      ]);
      await manager.query("DELETE FROM insights_paper_trades WHERE portfolio_id = $1", [
        portfolioId,
      ]);
      await manager.query(
        "DELETE FROM insights_paper_portfolio_snapshots WHERE portfolio_id = $1",
        [portfolioId],
      );
      await manager.query(
        `UPDATE insights_paper_portfolios
         SET current_cash_balance = starting_capital, current_portfolio_value = 0
         WHERE id = $1`,
        [portfolioId],
      );

      const after = await manager.query(
        `SELECT starting_capital, current_cash_balance, current_portfolio_value
         FROM insights_paper_portfolios WHERE id = $1`,
        [portfolioId],
      );
      console.log(
        `  after:  cash ${after[0].current_cash_balance}, value ${after[0].current_portfolio_value}`,
      );
    });
    console.log(`${SLUG} reset complete.`);
  } finally {
    await AppDataSource.destroy();
  }
}

resetNixPure().catch((error) => {
  console.error("Reset failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
