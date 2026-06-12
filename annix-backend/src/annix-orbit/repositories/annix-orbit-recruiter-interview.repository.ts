import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitRecruiterInterview } from "../entities/annix-orbit-recruiter-interview.entity";

export abstract class AnnixOrbitRecruiterInterviewRepository extends CrudRepository<AnnixOrbitRecruiterInterview> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitRecruiterInterview[]>;
  abstract findByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<AnnixOrbitRecruiterInterview | null>;
}
