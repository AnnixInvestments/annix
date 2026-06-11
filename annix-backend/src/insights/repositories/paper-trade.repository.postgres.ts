import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { TypeOrmTransactionContext } from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaperTrade } from "../entities/paper-trade.entity";
import { type LedgerNetRow, PaperTradeRepository } from "./paper-trade.repository";

@Injectable()
export class PostgresPaperTradeRepository
  extends TypeOrmCrudRepository<PaperTrade>
  implements PaperTradeRepository
{
  constructor(@InjectRepository(PaperTrade) repository: Repository<PaperTrade>) {
    super(repository);
  }

  findByPortfolioWithAsset(portfolioId: string, take: number): Promise<PaperTrade[]> {
    return this.repository.find({
      where: { portfolioId },
      relations: { asset: true },
      order: { executedAt: "DESC" },
      take,
    });
  }

  async existsContributionSince(portfolioId: string, since: Date): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder("t")
      .where("t.portfolio_id = :pid", { pid: portfolioId })
      .andWhere("t.action = 'contribution'")
      .andWhere("t.executed_at >= :since", { since })
      .getCount();
    return count > 0;
  }

  findEarliestBuy(portfolioId: string, assetId: string): Promise<PaperTrade | null> {
    return this.repository.findOne({
      where: { portfolioId, assetId, action: "buy" },
      order: { executedAt: "ASC" },
    });
  }

  ledgerNetByAsset(portfolioId: string): Promise<LedgerNetRow[]> {
    return this.repository
      .createQueryBuilder("t")
      .select("t.asset_id", "assetId")
      .addSelect("SUM(CASE WHEN t.action = 'buy' THEN t.quantity ELSE 0 END)", "buyQty")
      .addSelect("SUM(CASE WHEN t.action = 'sell' THEN t.quantity ELSE 0 END)", "sellQty")
      .addSelect("SUM(CASE WHEN t.action = 'buy' THEN t.quantity * t.price ELSE 0 END)", "buyCost")
      .where("t.portfolio_id = :pid", { pid: portfolioId })
      .andWhere("t.asset_id IS NOT NULL")
      .groupBy("t.asset_id")
      .getRawMany<LedgerNetRow>();
  }

  withTransaction(context: TransactionContext): PostgresPaperTradeRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresPaperTradeRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresPaperTradeRepository(context.manager.getRepository(PaperTrade));
  }
}
