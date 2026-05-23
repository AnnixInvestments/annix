import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One-time clean reset of the Nix · Pure paper portfolio. Its holdings had
 * desynced from the trade ledger (read -99% while the ledger said otherwise),
 * so it is wiped back to its starting capital with no trades/holdings/snapshots.
 * The snapshot service now self-heals holdings from the ledger, so this can't
 * silently recur. Idempotent: a no-op on environments already clean.
 */
export class ResetNixPurePaperPortfolio1820100001400 implements MigrationInterface {
  name = "ResetNixPurePaperPortfolio1820100001400";

  private readonly SLUG = "nix-pure";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      "SELECT id, starting_capital FROM insights_paper_portfolios WHERE slug = $1",
      [this.SLUG],
    );
    if (rows.length === 0) return;

    const portfolioId = rows[0].id;
    const startingCapital = rows[0].starting_capital;

    await queryRunner.query("DELETE FROM insights_paper_trades WHERE portfolio_id = $1", [
      portfolioId,
    ]);
    await queryRunner.query("DELETE FROM insights_paper_holdings WHERE portfolio_id = $1", [
      portfolioId,
    ]);
    await queryRunner.query(
      "DELETE FROM insights_paper_portfolio_snapshots WHERE portfolio_id = $1",
      [portfolioId],
    );
    await queryRunner.query(
      `UPDATE insights_paper_portfolios
         SET current_cash_balance = $2, current_portfolio_value = 0, updated_at = now()
       WHERE id = $1`,
      [portfolioId, startingCapital],
    );
  }

  public async down(): Promise<void> {
    // Irreversible data cleanup — the corrupted trade history is intentionally
    // not restored.
  }
}
