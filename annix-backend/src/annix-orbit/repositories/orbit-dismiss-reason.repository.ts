import { CrudRepository } from "../../lib/persistence/crud-repository";
import { OrbitDismissReason } from "../entities/orbit-dismiss-reason.entity";

export abstract class OrbitDismissReasonRepository extends CrudRepository<OrbitDismissReason> {
  abstract listAllSorted(): Promise<OrbitDismissReason[]>;
  abstract listActiveSorted(): Promise<OrbitDismissReason[]>;
  abstract findByCode(code: string): Promise<OrbitDismissReason | null>;
  abstract deleteById(id: number): Promise<void>;
}
