import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SlurryProfile } from "./entities/slurry-profile.entity";
import { SlurryProfileRepository } from "./slurry-profile.repository";

@Injectable()
export class PostgresSlurryProfileRepository
  extends TypeOrmCrudRepository<SlurryProfile>
  implements SlurryProfileRepository
{
  constructor(@InjectRepository(SlurryProfile) repository: Repository<SlurryProfile>) {
    super(repository);
  }

  findByCommodityWithRelation(commodityId: number): Promise<SlurryProfile | null> {
    return this.repository.findOne({ where: { commodityId }, relations: ["commodity"] });
  }

  findAllWithCommodity(): Promise<SlurryProfile[]> {
    return this.repository.find({ relations: ["commodity"], order: { commodityId: "ASC" } });
  }
}
