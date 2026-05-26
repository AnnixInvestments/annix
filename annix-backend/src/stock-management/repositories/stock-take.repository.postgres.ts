import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockTake, type StockTakeStatus } from "../entities/stock-take.entity";
import { StockTakeRepository } from "./stock-take.repository";

@Injectable()
export class PostgresStockTakeRepository
  extends TypeOrmCrudRepository<StockTake>
  implements StockTakeRepository
{
  constructor(@InjectRepository(StockTake) repository: Repository<StockTake>) {
    super(repository);
  }

  build(data: DeepPartial<StockTake>): StockTake {
    return this.repository.create(data as TypeOrmDeepPartial<StockTake>);
  }

  withTransaction(context: TransactionContext): PostgresStockTakeRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresStockTakeRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresStockTakeRepository(context.manager.getRepository(StockTake));
  }

  findByIdForCompany(companyId: number, id: number): Promise<StockTake | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByIdForCompanyWithLines(companyId: number, id: number): Promise<StockTake | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: { lines: { product: true, varianceCategory: true } },
    });
  }

  findForCompany(companyId: number, status: StockTakeStatus | undefined): Promise<StockTake[]> {
    const where: { companyId: number; status?: StockTakeStatus } = { companyId };
    if (status) {
      where.status = status;
    }
    return this.repository.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  findDraftForPeriod(companyId: number, periodLabel: string): Promise<StockTake | null> {
    return this.repository.findOne({
      where: { companyId, periodLabel, status: "draft" },
    });
  }

  async distinctCompanyIds(): Promise<number[]> {
    const rows = await this.repository
      .createQueryBuilder("st")
      .select("DISTINCT st.company_id", "company_id")
      .getRawMany<{ company_id: number }>();
    return rows.map((row) => row.company_id);
  }
}
