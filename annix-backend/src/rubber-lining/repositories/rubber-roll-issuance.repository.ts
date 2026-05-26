import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberRollIssuance } from "../entities/rubber-roll-issuance.entity";

export abstract class RubberRollIssuanceRepository extends CrudRepository<RubberRollIssuance> {
  abstract build(data: Partial<RubberRollIssuance>): RubberRollIssuance;
  abstract findAllWithRelations(): Promise<RubberRollIssuance[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberRollIssuance | null>;
  abstract findOneByIdWithRollStock(id: number): Promise<RubberRollIssuance | null>;
  abstract findOneByIdWithRollStockAndItems(id: number): Promise<RubberRollIssuance | null>;
}
