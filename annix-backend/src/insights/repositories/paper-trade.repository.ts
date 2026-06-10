import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaperTrade } from "../entities/paper-trade.entity";

export interface LedgerNetRow {
  assetId: string;
  buyQty: string;
  sellQty: string;
  buyCost: string;
}

export abstract class PaperTradeRepository extends CrudRepository<PaperTrade> {
  abstract findByPortfolioWithAsset(portfolioId: string, take: number): Promise<PaperTrade[]>;
  abstract existsContributionSince(portfolioId: string, since: Date): Promise<boolean>;
  abstract findEarliestBuy(portfolioId: string, assetId: string): Promise<PaperTrade | null>;
  abstract ledgerNetByAsset(portfolioId: string): Promise<LedgerNetRow[]>;
  abstract withTransaction(context: TransactionContext): PaperTradeRepository;
}
