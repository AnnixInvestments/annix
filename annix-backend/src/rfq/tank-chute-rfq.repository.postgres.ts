import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { TankChuteRfq } from "./entities/tank-chute-rfq.entity";
import { TankChuteRfqRepository } from "./tank-chute-rfq.repository";

@Injectable()
export class PostgresTankChuteRfqRepository
  extends TypeOrmCrudRepository<TankChuteRfq>
  implements TankChuteRfqRepository
{
  constructor(@InjectRepository(TankChuteRfq) repository: Repository<TankChuteRfq>) {
    super(repository);
  }
}
