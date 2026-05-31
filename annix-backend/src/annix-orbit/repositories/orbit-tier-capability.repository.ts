import { CrudRepository } from "../../lib/persistence/crud-repository";
import { OrbitTierCapability } from "../entities/orbit-tier-capability.entity";

export abstract class OrbitTierCapabilityRepository extends CrudRepository<OrbitTierCapability> {
  abstract findAllOrdered(): Promise<OrbitTierCapability[]>;
  abstract findByTier(tier: string): Promise<OrbitTierCapability | null>;
}
