import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationProgrammeOutcomeSignal } from "../entities/education-programme-outcome-signal.entity";
import { EducationProgrammeOutcomeSignalRepository } from "./education-programme-outcome-signal.repository";

@Injectable()
export class PostgresEducationProgrammeOutcomeSignalRepository
  extends TypeOrmCrudRepository<EducationProgrammeOutcomeSignal>
  implements EducationProgrammeOutcomeSignalRepository
{
  constructor(
    @InjectRepository(EducationProgrammeOutcomeSignal)
    repository: Repository<EducationProgrammeOutcomeSignal>,
  ) {
    super(repository);
  }

  forProgrammeIds(programmeIds: string[]): Promise<EducationProgrammeOutcomeSignal[]> {
    if (programmeIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({
      where: { programmeId: In(programmeIds) },
      order: { asOf: "DESC" },
    });
  }

  forProgrammeOrdered(programmeId: string): Promise<EducationProgrammeOutcomeSignal[]> {
    return this.repository.find({
      where: { programmeId },
      order: { asOf: "DESC", createdAt: "DESC" },
    });
  }
}
