import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { TypeOrmTransactionContext } from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import { PaperPortfolioRepository } from "./paper-portfolio.repository";

@Injectable()
export class PostgresPaperPortfolioRepository
  extends TypeOrmCrudRepository<PaperPortfolio>
  implements PaperPortfolioRepository
{
  constructor(@InjectRepository(PaperPortfolio) repository: Repository<PaperPortfolio>) {
    super(repository);
  }

  findActive(): Promise<PaperPortfolio[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  findAllOrderedByCreatedAt(): Promise<PaperPortfolio[]> {
    return this.repository.find({ order: { createdAt: "ASC" } });
  }

  findBySlug(slug: string): Promise<PaperPortfolio | null> {
    return this.repository.findOne({
      where: { slug: slug as PaperPortfolio["slug"] },
    });
  }

  findByIdOrFail(id: string): Promise<PaperPortfolio> {
    return this.repository.findOneOrFail({ where: { id } });
  }

  findActiveBuyAndHold(): Promise<PaperPortfolio[]> {
    return this.repository.find({
      where: { isActive: true, executorStrategy: "buy-and-hold" },
    });
  }

  async updateById(id: string, changes: Partial<PaperPortfolio>): Promise<void> {
    await this.repository.update({ id }, changes as QueryDeepPartialEntity<PaperPortfolio>);
  }

  withTransaction(context: TransactionContext): PostgresPaperPortfolioRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresPaperPortfolioRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresPaperPortfolioRepository(context.manager.getRepository(PaperPortfolio));
  }
}
