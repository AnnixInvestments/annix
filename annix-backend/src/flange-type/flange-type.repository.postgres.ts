import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangeType } from "./entities/flange-type.entity";
import { FlangeTypeRepository } from "./flange-type.repository";

@Injectable()
export class PostgresFlangeTypeRepository
  extends TypeOrmCrudRepository<FlangeType>
  implements FlangeTypeRepository
{
  constructor(@InjectRepository(FlangeType) repository: Repository<FlangeType>) {
    super(repository);
  }

  findAllOrdered(): Promise<FlangeType[]> {
    return this.repository.find({ order: { code: "ASC" } });
  }

  findByCode(code: string): Promise<FlangeType | null> {
    return this.repository.findOne({ where: { code } });
  }

  findByAbbreviation(abbreviation: string): Promise<FlangeType | null> {
    return this.repository.findOne({ where: { abbreviation } });
  }
}
