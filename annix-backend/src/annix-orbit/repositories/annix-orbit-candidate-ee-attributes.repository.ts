import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitCandidateEeAttributes } from "../entities/annix-orbit-candidate-ee-attributes.entity";

export interface EeDemographicRow {
  population_group: string;
  gender: string;
  disability_status: string;
  nationality_status: string;
}

export interface EeReportRow extends EeDemographicRow {
  candidate_id: number;
  candidate_status: string;
  occupational_level: string | null;
}

export abstract class AnnixOrbitCandidateEeAttributesRepository extends CrudRepository<AnnixOrbitCandidateEeAttributes> {
  abstract findActiveForCandidate(
    candidateId: number,
  ): Promise<AnnixOrbitCandidateEeAttributes | null>;
  abstract tombstoneActiveForCandidate(candidateId: number, deletedAt: Date): Promise<number>;
  abstract aggregateForJob(jobPostingId: number): Promise<EeDemographicRow[]>;
  abstract aggregateForCompany(
    companyId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<EeDemographicRow[]>;
  abstract reportRows(companyId: number, dateFrom: Date, dateTo: Date): Promise<EeReportRow[]>;
}
