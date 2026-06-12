import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitJob } from "../entities/annix-orbit-job.entity";

export abstract class AnnixOrbitJobRepository extends CrudRepository<AnnixOrbitJob> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitJob[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitJob | null>;
}
