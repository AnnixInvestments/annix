import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DnExtractionCorrection } from "../entities/dn-extraction-correction.entity";
import { DnExtractionCorrectionRepository } from "./dn-extraction-correction.repository";

@Injectable()
export class PostgresDnExtractionCorrectionRepository
  extends TypeOrmCrudRepository<DnExtractionCorrection>
  implements DnExtractionCorrectionRepository
{
  constructor(
    @InjectRepository(DnExtractionCorrection)
    repository: Repository<DnExtractionCorrection>,
  ) {
    super(repository);
  }

  createMany(rows: Array<DeepPartial<DnExtractionCorrection>>): Promise<DnExtractionCorrection[]> {
    const entities = rows.map((row) => this.repository.create(row));
    return this.repository.save(entities);
  }

  findRecentForCompany(companyId: number, limit: number): Promise<DnExtractionCorrection[]> {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
