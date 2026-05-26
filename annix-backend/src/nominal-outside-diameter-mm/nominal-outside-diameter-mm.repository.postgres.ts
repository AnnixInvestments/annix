import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository";

@Injectable()
export class PostgresNominalOutsideDiameterMmRepository
  extends TypeOrmCrudRepository<NominalOutsideDiameterMm>
  implements NominalOutsideDiameterMmRepository
{
  constructor(
    @InjectRepository(NominalOutsideDiameterMm) repository: Repository<NominalOutsideDiameterMm>,
  ) {
    super(repository);
  }
}
