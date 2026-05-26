import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationProgrammeOutcomeSignal } from "../entities/education-programme-outcome-signal.entity";

export abstract class EducationProgrammeOutcomeSignalRepository extends CrudRepository<EducationProgrammeOutcomeSignal> {
  abstract forProgrammeIds(programmeIds: string[]): Promise<EducationProgrammeOutcomeSignal[]>;
  abstract forProgrammeOrdered(programmeId: string): Promise<EducationProgrammeOutcomeSignal[]>;
}
