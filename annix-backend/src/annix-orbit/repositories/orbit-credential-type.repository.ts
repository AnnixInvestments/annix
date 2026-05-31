import { CrudRepository } from "../../lib/persistence/crud-repository";
import { OrbitCredentialType } from "../entities/orbit-credential-type.entity";

export abstract class OrbitCredentialTypeRepository extends CrudRepository<OrbitCredentialType> {
  abstract listAllSorted(): Promise<OrbitCredentialType[]>;
  abstract listActiveSorted(): Promise<OrbitCredentialType[]>;
  abstract findByCode(code: string): Promise<OrbitCredentialType | null>;
  abstract deleteById(id: number): Promise<void>;
}
