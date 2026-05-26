import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import {
  MonthlyAccountStatus,
  MonthlyAccountType,
  RubberMonthlyAccount,
} from "../entities/rubber-monthly-account.entity";

export interface MonthlyAccountFilters {
  accountType?: MonthlyAccountType;
  status?: MonthlyAccountStatus;
  year?: number;
}

export abstract class RubberMonthlyAccountRepository extends CrudRepository<RubberMonthlyAccount> {
  abstract build(data: Partial<RubberMonthlyAccount>): RubberMonthlyAccount;
  abstract findFilteredOrdered(filters?: MonthlyAccountFilters): Promise<RubberMonthlyAccount[]>;
  abstract updateById(id: number, updates: DeepPartial<RubberMonthlyAccount>): Promise<void>;
}
