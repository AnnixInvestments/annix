import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberAccountSignOff } from "../entities/rubber-account-sign-off.entity";

export abstract class RubberAccountSignOffRepository extends CrudRepository<RubberAccountSignOff> {
  abstract build(data: Partial<RubberAccountSignOff>): RubberAccountSignOff;
  abstract findByMonthlyAccountId(monthlyAccountId: number): Promise<RubberAccountSignOff[]>;
  abstract findOneByToken(token: string): Promise<RubberAccountSignOff | null>;
}
