import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberPricingTier } from "../entities/rubber-pricing-tier.entity";

export abstract class RubberPricingTierRepository extends CrudRepository<RubberPricingTier> {
  abstract build(data: Partial<RubberPricingTier>): RubberPricingTier;
  abstract findAllOrderedByPricingFactor(): Promise<RubberPricingTier[]>;
  abstract deleteById(id: number): Promise<boolean>;
}
