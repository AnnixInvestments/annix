import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CommodityRepository } from "./commodity.repository";
import { Commodity } from "./entities/commodity.entity";

@Injectable()
export class PostgresCommodityRepository
  extends TypeOrmCrudRepository<Commodity>
  implements CommodityRepository
{
  constructor(@InjectRepository(Commodity) repository: Repository<Commodity>) {
    super(repository);
  }

  findAllOrdered(): Promise<Commodity[]> {
    return this.repository.find({ order: { commodityName: "ASC" } });
  }

  findByIdWithRelations(id: number): Promise<Commodity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
