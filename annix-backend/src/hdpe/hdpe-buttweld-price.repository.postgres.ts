import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { HdpeButtweldPrice } from "./entities/hdpe-buttweld-price.entity";
import { HdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository";

@Injectable()
export class PostgresHdpeButtweldPriceRepository
  extends TypeOrmCrudRepository<HdpeButtweldPrice>
  implements HdpeButtweldPriceRepository
{
  constructor(@InjectRepository(HdpeButtweldPrice) repository: Repository<HdpeButtweldPrice>) {
    super(repository);
  }

  findByNominalBore(nominalBore: number): Promise<HdpeButtweldPrice | null> {
    return this.repository.findOne({ where: { nominalBore, isActive: true } });
  }
}
