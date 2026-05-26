import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { StockControlProfile } from "../entities/stock-control-profile.entity";

export abstract class StockControlProfileRepository extends CrudRepository<StockControlProfile> {
  abstract findOneByUserId(userId: number): Promise<StockControlProfile | null>;
  abstract findOneByUserIdWithRelations(
    userId: number,
    relations: string[],
  ): Promise<StockControlProfile | null>;
  abstract findOneOrFailByUserId(userId: number): Promise<StockControlProfile>;
  abstract updateByUserId(userId: number, updates: DeepPartial<StockControlProfile>): Promise<void>;
}
