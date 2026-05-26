import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CostRateType, RubberCostRate } from "../entities/rubber-cost-rate.entity";

export abstract class RubberCostRateRepository extends CrudRepository<RubberCostRate> {
  abstract build(data: Partial<RubberCostRate>): RubberCostRate;
  abstract findAllWithCodingOrdered(rateType?: CostRateType): Promise<RubberCostRate[]>;
  abstract findOneByIdWithCoding(id: number): Promise<RubberCostRate | null>;
  abstract findOneByRateType(rateType: CostRateType): Promise<RubberCostRate | null>;
  abstract findOneByRateTypeAndCoding(
    rateType: CostRateType,
    compoundCodingId: number,
  ): Promise<RubberCostRate | null>;
  abstract findByRateType(rateType: CostRateType): Promise<RubberCostRate[]>;
  abstract deleteById(id: number): Promise<boolean>;
}
