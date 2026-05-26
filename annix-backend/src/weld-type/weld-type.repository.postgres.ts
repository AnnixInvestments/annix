import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { WeldType } from "./entities/weld-type.entity";
import { WeldTypeRepository } from "./weld-type.repository";

@Injectable()
export class PostgresWeldTypeRepository
  extends TypeOrmCrudRepository<WeldType>
  implements WeldTypeRepository
{
  constructor(@InjectRepository(WeldType) repository: Repository<WeldType>) {
    super(repository);
  }

  findByCode(weld_code: string): Promise<WeldType | null> {
    return this.repository.findOne({ where: { weld_code } });
  }
}
