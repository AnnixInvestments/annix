import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberWastageBin } from "../entities/rubber-wastage-bin.entity";

export abstract class RubberWastageBinRepository extends CrudRepository<RubberWastageBin> {
  abstract build(data: DeepPartial<RubberWastageBin>): RubberWastageBin;
  abstract withTransaction(context: TransactionContext): RubberWastageBinRepository;
  abstract findActiveForCompany(companyId: number): Promise<RubberWastageBin[]>;
  abstract findByColour(companyId: number, colour: string): Promise<RubberWastageBin | null>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<RubberWastageBin | null>;
}
