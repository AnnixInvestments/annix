import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";
import { NbNpsLookupRepository } from "./nb-nps-lookup.repository";

@Injectable()
export class PostgresNbNpsLookupRepository
  extends TypeOrmCrudRepository<NbNpsLookup>
  implements NbNpsLookupRepository
{
  constructor(@InjectRepository(NbNpsLookup) repository: Repository<NbNpsLookup>) {
    super(repository);
  }

  findByNbMm(nbMm: number): Promise<NbNpsLookup | null> {
    return this.repository.findOne({ where: { nb_mm: nbMm } });
  }
}
