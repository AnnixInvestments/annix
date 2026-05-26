import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StaffSignature } from "../entities/staff-signature.entity";

export abstract class StaffSignatureRepository extends CrudRepository<StaffSignature> {
  abstract findByUser(userId: number): Promise<StaffSignature | null>;
}
