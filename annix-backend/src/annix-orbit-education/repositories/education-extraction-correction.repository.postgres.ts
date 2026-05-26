import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationExtractionCorrection } from "../entities/education-extraction-correction.entity";
import { EducationExtractionCorrectionRepository } from "./education-extraction-correction.repository";

@Injectable()
export class PostgresEducationExtractionCorrectionRepository
  extends TypeOrmCrudRepository<EducationExtractionCorrection>
  implements EducationExtractionCorrectionRepository
{
  constructor(
    @InjectRepository(EducationExtractionCorrection)
    repository: Repository<EducationExtractionCorrection>,
  ) {
    super(repository);
  }

  recentForInstitution(
    institutionId: string,
    limit: number,
  ): Promise<EducationExtractionCorrection[]> {
    return this.repository.find({
      where: { institutionId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
