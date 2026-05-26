import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberQualityAlert } from "../entities/rubber-quality-alert.entity";
import { RubberQualityAlertRepository } from "./rubber-quality-alert.repository";

@Injectable()
export class PostgresRubberQualityAlertRepository
  extends TypeOrmCrudRepository<RubberQualityAlert>
  implements RubberQualityAlertRepository
{
  constructor(@InjectRepository(RubberQualityAlert) repository: Repository<RubberQualityAlert>) {
    super(repository);
  }

  build(data: Partial<RubberQualityAlert>): RubberQualityAlert {
    return this.repository.create(data as TypeOrmDeepPartial<RubberQualityAlert>);
  }

  saveMany(entities: RubberQualityAlert[]): Promise<RubberQualityAlert[]> {
    return this.repository.save(entities);
  }

  findActiveOrdered(): Promise<RubberQualityAlert[]> {
    return this.repository.find({
      where: { acknowledgedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
  }

  findByCompoundCodeOrdered(compoundCode: string): Promise<RubberQualityAlert[]> {
    return this.repository.find({
      where: { compoundCode },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  countActiveByCompoundCode(compoundCode: string): Promise<number> {
    return this.repository.count({
      where: { compoundCode, acknowledgedAt: IsNull() },
    });
  }
}
