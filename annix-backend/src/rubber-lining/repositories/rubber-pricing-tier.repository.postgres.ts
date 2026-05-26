import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberPricingTier } from "../entities/rubber-pricing-tier.entity";
import { RubberPricingTierRepository } from "./rubber-pricing-tier.repository";

@Injectable()
export class PostgresRubberPricingTierRepository
  extends TypeOrmCrudRepository<RubberPricingTier>
  implements RubberPricingTierRepository
{
  constructor(@InjectRepository(RubberPricingTier) repository: Repository<RubberPricingTier>) {
    super(repository);
  }

  build(data: Partial<RubberPricingTier>): RubberPricingTier {
    return this.repository.create(data as TypeOrmDeepPartial<RubberPricingTier>);
  }

  findAllOrderedByPricingFactor(): Promise<RubberPricingTier[]> {
    return this.repository.find({ order: { pricingFactor: "ASC" } });
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }
}
