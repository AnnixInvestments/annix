import { CrudRepository } from "../../lib/persistence/crud-repository";
import { PendingSeekerTier } from "../entities/pending-seeker-tier.entity";

export abstract class PendingSeekerTierRepository extends CrudRepository<PendingSeekerTier> {
  abstract findByEmailNormalized(email: string): Promise<PendingSeekerTier | null>;
  abstract deleteByEmailNormalized(email: string): Promise<void>;
}
