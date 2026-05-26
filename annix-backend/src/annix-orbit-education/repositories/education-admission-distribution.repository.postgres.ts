import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationAdmissionDistribution } from "../entities/education-admission-distribution.entity";
import { EducationAdmissionDistributionRepository } from "./education-admission-distribution.repository";

@Injectable()
export class PostgresEducationAdmissionDistributionRepository
  extends TypeOrmCrudRepository<EducationAdmissionDistribution>
  implements EducationAdmissionDistributionRepository
{
  constructor(
    @InjectRepository(EducationAdmissionDistribution)
    repository: Repository<EducationAdmissionDistribution>,
  ) {
    super(repository);
  }

  forProgrammeOrderedByYear(programmeId: string): Promise<EducationAdmissionDistribution[]> {
    return this.repository.find({
      where: { programmeId },
      order: { intakeYear: "DESC" },
    });
  }
}
