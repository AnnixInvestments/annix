import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardRepository } from "./flange-standard.repository";

@Injectable()
export class PostgresFlangeStandardRepository
  extends TypeOrmCrudRepository<FlangeStandard>
  implements FlangeStandardRepository
{
  constructor(@InjectRepository(FlangeStandard) repository: Repository<FlangeStandard>) {
    super(repository);
  }

  findByIds(ids: number[]): Promise<FlangeStandard[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.find({ where: { id: In(ids) } });
  }
}
