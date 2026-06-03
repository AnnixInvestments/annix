import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerEmploymentRecord } from "../entities/seeker-employment-record.entity";

export abstract class SeekerEmploymentRecordRepository extends CrudRepository<SeekerEmploymentRecord> {
  abstract listForCandidates(candidateIds: number[]): Promise<SeekerEmploymentRecord[]>;
}
