import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AcademicResult } from "../entities/academic-result.entity";

export abstract class AcademicResultRepository extends CrudRepository<AcademicResult> {
  abstract orderedForProfile(educationProfileId: string): Promise<AcademicResult[]>;
  abstract forProfile(educationProfileId: string): Promise<AcademicResult[]>;
  abstract deleteByIdForProfile(resultId: string, educationProfileId: string): Promise<number>;
}
