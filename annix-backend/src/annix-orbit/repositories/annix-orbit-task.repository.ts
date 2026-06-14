import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitTask } from "../entities/annix-orbit-task.entity";

export abstract class AnnixOrbitTaskRepository extends CrudRepository<AnnixOrbitTask> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitTask[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTask | null>;
  abstract deleteById(id: number): Promise<void>;
}
