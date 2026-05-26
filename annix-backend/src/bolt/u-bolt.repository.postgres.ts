import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { UBoltEntity } from "./entities/u-bolt.entity";
import { UBoltRepository } from "./u-bolt.repository";

@Injectable()
export class PostgresUBoltRepository
  extends TypeOrmCrudRepository<UBoltEntity>
  implements UBoltRepository
{
  constructor(@InjectRepository(UBoltEntity) repository: Repository<UBoltEntity>) {
    super(repository);
  }

  async uBolts(nbMm?: number): Promise<UBoltEntity[]> {
    const query = this.repository.createQueryBuilder("ub");

    if (nbMm) {
      query.andWhere("ub.nb_mm = :nbMm", { nbMm });
    }

    return query.orderBy("ub.nb_mm", "ASC").getMany();
  }

  async uBolt(nbMm: number, threadSize?: string): Promise<UBoltEntity | null> {
    const query = this.repository.createQueryBuilder("ub").where("ub.nb_mm = :nbMm", { nbMm });

    if (threadSize) {
      query.andWhere("ub.thread_size = :threadSize", { threadSize });
    }

    return query.getOne();
  }
}
