import { CrudRepository } from "../../../lib/persistence/crud-repository";
import type { OrbitIdentity } from "../entities/orbit-identity.entity";

/**
 * Module-scoped identity repository. Each concrete subclass is bound to exactly
 * one Orbit identity collection, so `findByEmailLower` is the canonical lookup
 * and there is deliberately NO cross-collection / module-agnostic query method
 * (ADR-0001: the #389 bleed must be structurally impossible).
 */
export abstract class OrbitIdentityRepository<
  Entity extends OrbitIdentity,
> extends CrudRepository<Entity> {
  abstract findByEmailLower(emailLower: string): Promise<Entity | null>;
}
