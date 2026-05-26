import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NbOdLookup } from "./entities/nb-od-lookup.entity";
import { NbOdLookupRepository } from "./nb-od-lookup.repository";

@Injectable()
export class PostgresNbOdLookupRepository
  extends TypeOrmCrudRepository<NbOdLookup>
  implements NbOdLookupRepository
{
  constructor(@InjectRepository(NbOdLookup) repository: Repository<NbOdLookup>) {
    super(repository);
  }

  findAllOrdered(): Promise<NbOdLookup[]> {
    return this.repository.find({ order: { nominal_bore_mm: "ASC" } });
  }

  findByNominalBore(nominalBoreMm: number): Promise<NbOdLookup | null> {
    return this.repository.findOne({ where: { nominal_bore_mm: nominalBoreMm } });
  }

  allNominalBores(): Promise<{ nominalBoreMm: number }[]> {
    return this.repository
      .createQueryBuilder("nb")
      .select("nb.nominal_bore_mm", "nominalBoreMm")
      .orderBy("nb.nominal_bore_mm", "ASC")
      .getRawMany<{ nominalBoreMm: number }>();
  }
}
