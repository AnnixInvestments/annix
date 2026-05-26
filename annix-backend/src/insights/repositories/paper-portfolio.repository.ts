import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";

export abstract class PaperPortfolioRepository extends CrudRepository<PaperPortfolio> {
  abstract findActive(): Promise<PaperPortfolio[]>;
  abstract findAllOrderedByCreatedAt(): Promise<PaperPortfolio[]>;
  abstract findBySlug(slug: string): Promise<PaperPortfolio | null>;
  abstract findByIdOrFail(id: string): Promise<PaperPortfolio>;
  abstract findActiveBuyAndHold(): Promise<PaperPortfolio[]>;
  abstract updateById(id: string, changes: Partial<PaperPortfolio>): Promise<void>;
  abstract withTransaction(context: TransactionContext): PaperPortfolioRepository;
}
