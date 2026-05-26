import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { TypeOrmTransactionContext } from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaperHolding } from "../entities/paper-holding.entity";
import { PaperHoldingRepository } from "./paper-holding.repository";

@Injectable()
export class PostgresPaperHoldingRepository
  extends TypeOrmCrudRepository<PaperHolding>
  implements PaperHoldingRepository
{
  constructor(@InjectRepository(PaperHolding) repository: Repository<PaperHolding>) {
    super(repository);
  }

  findByPortfolio(portfolioId: string): Promise<PaperHolding[]> {
    return this.repository.find({ where: { portfolioId } });
  }

  findByPortfolioWithAsset(portfolioId: string): Promise<PaperHolding[]> {
    return this.repository.find({
      where: { portfolioId },
      relations: { asset: true },
    });
  }

  findByPortfolioWithAssetOrdered(portfolioId: string): Promise<PaperHolding[]> {
    return this.repository.find({
      where: { portfolioId },
      relations: { asset: true },
      order: { firstAcquiredAt: "ASC" },
    });
  }

  countByPortfolio(portfolioId: string): Promise<number> {
    return this.repository.count({ where: { portfolioId } });
  }

  findByPortfolioAndAsset(portfolioId: string, assetId: string): Promise<PaperHolding | null> {
    return this.repository.findOne({ where: { portfolioId, assetId } });
  }

  async updateById(id: string, changes: Partial<PaperHolding>): Promise<void> {
    await this.repository.update({ id }, changes as QueryDeepPartialEntity<PaperHolding>);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  withTransaction(context: TransactionContext): PostgresPaperHoldingRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresPaperHoldingRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresPaperHoldingRepository(context.manager.getRepository(PaperHolding));
  }
}
