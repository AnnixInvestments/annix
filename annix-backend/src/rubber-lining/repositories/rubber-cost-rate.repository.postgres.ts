import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CostRateType, RubberCostRate } from "../entities/rubber-cost-rate.entity";
import { RubberCostRateRepository } from "./rubber-cost-rate.repository";

@Injectable()
export class PostgresRubberCostRateRepository
  extends TypeOrmCrudRepository<RubberCostRate>
  implements RubberCostRateRepository
{
  constructor(@InjectRepository(RubberCostRate) repository: Repository<RubberCostRate>) {
    super(repository);
  }

  build(data: Partial<RubberCostRate>): RubberCostRate {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCostRate>);
  }

  findAllWithCodingOrdered(rateType?: CostRateType): Promise<RubberCostRate[]> {
    const qb = this.repository
      .createQueryBuilder("cr")
      .leftJoinAndSelect("cr.compoundCoding", "cc");

    if (rateType) {
      qb.andWhere("cr.rateType = :rateType", { rateType });
    }

    qb.orderBy("cr.rateType", "ASC").addOrderBy("cc.code", "ASC");

    return qb.getMany();
  }

  findOneByIdWithCoding(id: number): Promise<RubberCostRate | null> {
    return this.repository
      .createQueryBuilder("cr")
      .leftJoinAndSelect("cr.compoundCoding", "cc")
      .where("cr.id = :id", { id })
      .getOne();
  }

  findOneByRateType(rateType: CostRateType): Promise<RubberCostRate | null> {
    return this.repository.findOneBy({ rateType });
  }

  findOneByRateTypeAndCoding(
    rateType: CostRateType,
    compoundCodingId: number,
  ): Promise<RubberCostRate | null> {
    return this.repository.findOneBy({ rateType, compoundCodingId });
  }

  findByRateType(rateType: CostRateType): Promise<RubberCostRate[]> {
    return this.repository.find({
      where: { rateType },
    });
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }
}
