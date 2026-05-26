import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { HdpeStubPrice } from "./entities/hdpe-stub-price.entity";
import { HdpeStubPriceRepository } from "./hdpe-stub-price.repository";

@Injectable()
export class PostgresHdpeStubPriceRepository
  extends TypeOrmCrudRepository<HdpeStubPrice>
  implements HdpeStubPriceRepository
{
  constructor(@InjectRepository(HdpeStubPrice) repository: Repository<HdpeStubPrice>) {
    super(repository);
  }

  findByNominalBore(nominalBore: number): Promise<HdpeStubPrice | null> {
    return this.repository.findOne({ where: { nominalBore, isActive: true } });
  }
}
