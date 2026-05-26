import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BoltMassRepository } from "./bolt-mass.repository";
import { BoltMass } from "./entities/bolt-mass.entity";

@Injectable()
export class PostgresBoltMassRepository
  extends TypeOrmCrudRepository<BoltMass>
  implements BoltMassRepository
{
  constructor(@InjectRepository(BoltMass) repository: Repository<BoltMass>) {
    super(repository);
  }

  findClosestByBoltAndMinLength(boltId: number, minLengthMm: number): Promise<BoltMass | null> {
    return this.repository
      .createQueryBuilder("bm")
      .where("bm.bolt = :boltId", { boltId })
      .andWhere("bm.length_mm >= :minLength", { minLength: minLengthMm })
      .orderBy("bm.length_mm", "ASC")
      .getOne();
  }
}
