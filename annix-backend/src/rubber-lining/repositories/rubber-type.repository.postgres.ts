import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberType } from "../entities/rubber-type.entity";
import { RubberTypeRepository } from "./rubber-type.repository";

@Injectable()
export class PostgresRubberTypeRepository
  extends TypeOrmCrudRepository<RubberType>
  implements RubberTypeRepository
{
  constructor(@InjectRepository(RubberType) repository: Repository<RubberType>) {
    super(repository);
  }

  build(data: Partial<RubberType>): RubberType {
    return this.repository.create(data as TypeOrmDeepPartial<RubberType>);
  }

  findAllOrderedByTypeNumber(): Promise<RubberType[]> {
    return this.repository.find({ order: { typeNumber: "ASC" } });
  }

  findOneByTypeNumber(typeNumber: number): Promise<RubberType | null> {
    return this.repository.findOne({ where: { typeNumber } });
  }
}
