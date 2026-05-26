import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PvcCementPrice } from "./entities/pvc-cement-price.entity";
import { PvcCementPriceRepository } from "./pvc-cement-price.repository";

@Injectable()
export class PostgresPvcCementPriceRepository
  extends TypeOrmCrudRepository<PvcCementPrice>
  implements PvcCementPriceRepository
{
  constructor(@InjectRepository(PvcCementPrice) repository: Repository<PvcCementPrice>) {
    super(repository);
  }

  findActiveByDN(nominalDiameter: number): Promise<PvcCementPrice | null> {
    return this.repository.findOne({ where: { nominalDiameter, isActive: true } });
  }
}
