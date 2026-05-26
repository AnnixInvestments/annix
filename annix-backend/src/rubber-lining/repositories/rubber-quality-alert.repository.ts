import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberQualityAlert } from "../entities/rubber-quality-alert.entity";

export abstract class RubberQualityAlertRepository extends CrudRepository<RubberQualityAlert> {
  abstract build(data: Partial<RubberQualityAlert>): RubberQualityAlert;
  abstract saveMany(entities: RubberQualityAlert[]): Promise<RubberQualityAlert[]>;
  abstract findActiveOrdered(): Promise<RubberQualityAlert[]>;
  abstract findByCompoundCodeOrdered(compoundCode: string): Promise<RubberQualityAlert[]>;
  abstract countActiveByCompoundCode(compoundCode: string): Promise<number>;
}
