import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockTake, type StockTakeStatus } from "../entities/stock-take.entity";

export abstract class StockTakeRepository extends CrudRepository<StockTake> {
  abstract build(data: DeepPartial<StockTake>): StockTake;
  abstract withTransaction(context: TransactionContext): StockTakeRepository;
  abstract findByIdForCompany(companyId: number, id: number): Promise<StockTake | null>;
  abstract findByIdForCompanyWithLines(companyId: number, id: number): Promise<StockTake | null>;
  abstract findForCompany(
    companyId: number,
    status: StockTakeStatus | undefined,
  ): Promise<StockTake[]>;
  abstract findDraftForPeriod(companyId: number, periodLabel: string): Promise<StockTake | null>;
  abstract distinctCompanyIds(): Promise<number[]>;
}
