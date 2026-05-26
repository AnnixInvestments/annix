import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaperHolding } from "../entities/paper-holding.entity";

export abstract class PaperHoldingRepository extends CrudRepository<PaperHolding> {
  abstract findByPortfolio(portfolioId: string): Promise<PaperHolding[]>;
  abstract findByPortfolioWithAsset(portfolioId: string): Promise<PaperHolding[]>;
  abstract findByPortfolioWithAssetOrdered(portfolioId: string): Promise<PaperHolding[]>;
  abstract countByPortfolio(portfolioId: string): Promise<number>;
  abstract findByPortfolioAndAsset(
    portfolioId: string,
    assetId: string,
  ): Promise<PaperHolding | null>;
  abstract updateById(id: string, changes: Partial<PaperHolding>): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
  abstract withTransaction(context: TransactionContext): PaperHoldingRepository;
}
