import { CrudRepository } from "../../../lib/persistence/crud-repository";
import type { IdentityRegistryEntry } from "../entities/identity-registry-entry.entity";

/**
 * Routing store for the global user-id space (ADR-0001 / M0). Population happens
 * later (M1/S3); this slice ships the store + lookups only.
 */
export abstract class IdentityRegistryRepository extends CrudRepository<IdentityRegistryEntry> {
  /** Idempotently records the app + module that owns `userId`. */
  abstract upsert(userId: number, app: string, module: string, emailLower: string): Promise<void>;

  abstract findByUserId(userId: number): Promise<IdentityRegistryEntry | null>;

  /** Removes the routing entry for a userId (used when an identity is deleted). */
  abstract deleteByUserId(userId: number): Promise<void>;

  /**
   * Returns every entry for an email. `emailLower` is NOT unique here: one person
   * can hold separate identities (and userIds) across apps/modules.
   */
  abstract findByEmailLower(emailLower: string): Promise<IdentityRegistryEntry[]>;
}
