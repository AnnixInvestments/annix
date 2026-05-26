import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationRequirementVersion } from "../entities/education-requirement-version.entity";
import { EducationRequirementVersionRepository } from "./education-requirement-version.repository";

@Injectable()
export class PostgresEducationRequirementVersionRepository
  extends TypeOrmCrudRepository<EducationRequirementVersion>
  implements EducationRequirementVersionRepository
{
  constructor(
    @InjectRepository(EducationRequirementVersion)
    repository: Repository<EducationRequirementVersion>,
  ) {
    super(repository);
  }

  latestForProgrammeAndYear(
    programmeId: string,
    intakeYear: number,
  ): Promise<EducationRequirementVersion | null> {
    return this.repository.findOne({
      where: { programmeId, intakeYear },
      order: { createdAt: "DESC" },
    });
  }

  forProgrammeOrdered(programmeId: string): Promise<EducationRequirementVersion[]> {
    return this.repository.find({
      where: { programmeId },
      order: { intakeYear: "DESC", createdAt: "DESC" },
    });
  }
}
