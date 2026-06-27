import type { Connection, Model, mongo } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import type { OrbitIdentity } from "../entities/orbit-identity.entity";

/**
 * Shared counter key for ALL four Orbit identity collections. Every module-bound
 * Mongo identity repository overrides `counterKey()` to return this single value
 * so the four collections mint `_id`s from one sequence — preserving the global
 * numeric id space the 61 `UserRepository` consumers and the JWT `sub` claim
 * depend on (ADR-0001 non-negotiable condition #1).
 */
export const ORBIT_IDENTITY_COUNTER_KEY = "orbit_identity";

/** The four physically-separate Orbit identity collections (on ORBIT_CONNECTION). */
export const ORBIT_IDENTITY_COLLECTIONS = [
  "orbit_company_identities",
  "orbit_seeker_identities",
  "orbit_recruiter_identities",
  "orbit_student_identities",
] as const;

/** Core (default-connection) collection the global user-id space originates from. */
export const CORE_USER_COLLECTION = "user";

/** Max numeric `_id` in a single native collection, or 0 when empty. */
async function maxNumericId(collection: mongo.Collection): Promise<number> {
  // `$type: "number"` is a valid Mongo BSON-type alias (matches int/long/double)
  // but is absent from the native driver's stricter type list, so cast the filter.
  const numericId = { _id: { $type: "number" } } as never;
  const top = await collection.find(numericId).sort({ _id: -1 }).limit(1).toArray();
  const value = top.length > 0 ? Number((top[0] as { _id: unknown })._id) : 0;
  return Number.isFinite(value) ? value : 0;
}

export abstract class MongoOrbitIdentityRepository<
  Entity extends OrbitIdentity,
> extends MongoCrudRepository<Entity> {
  /**
   * `coreConnection` is the default (core-cluster) connection where the legacy
   * `user` collection lives. The Orbit identity collections live on
   * ORBIT_CONNECTION (`this.model.db`), so the global high-water mark spans two
   * physically-separate connections.
   */
  constructor(
    model: Model<Entity>,
    private readonly coreConnection: Connection,
  ) {
    super(model);
  }

  protected override counterKey(): string {
    return ORBIT_IDENTITY_COUNTER_KEY;
  }

  /**
   * Shared-sequence reseed source: the max `_id` across the ENTIRE global user-id
   * space (core `user` + all four `orbit_*_identities`), never a single
   * collection. Because the `orbit_identity` counter is shared and M1 copies
   * `user` rows preserving `_id`, reseeding off anything narrower could re-mint a
   * live id and collide with a platform FK / JWT `sub`.
   */
  protected override async highestReseedId(): Promise<number> {
    const orbitDb = this.model.db.db;
    const coreDb = this.coreConnection.db;
    if (!orbitDb || !coreDb) {
      throw new Error("Mongo connections are not ready for shared orbit_identity reseed");
    }
    const maxima = await Promise.all([
      ...ORBIT_IDENTITY_COLLECTIONS.map((name) => maxNumericId(orbitDb.collection(name))),
      maxNumericId(coreDb.collection(CORE_USER_COLLECTION)),
    ]);
    return maxima.reduce((highest, value) => (value > highest ? value : highest), 0);
  }

  async findByEmailLower(emailLower: string): Promise<Entity | null> {
    const document = await this.documents
      .findOne({ emailLower })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }
}
