import type { PaginatedResult } from "../dto/pagination-query.dto";

export type EntityId = string | number;

export interface PersistedEntity {
  id: EntityId;
}

export interface FindPageOptions<Entity> {
  page?: number;
  limit?: number;
  sort?: Record<string, "ASC" | "DESC">;
  projection?: string[];
  excludeFields?: string[];
  relations?: string[];
  filter?: Record<string, unknown>;
  // How to populate total/totalPages (#404 architecture-6):
  //   "exact"     — countDocuments(filter); accurate but a full scan per page.
  //   "estimated" — estimatedDocumentCount() when the filter is empty (cheap,
  //                 collection metadata); falls back to "none" when filtered.
  //                 Do NOT use on a session/transaction-bound findPage —
  //                 estimatedDocumentCount is not allowed inside a transaction.
  //   "none"      — fetch limit+1 to derive hasNextPage only; no count query.
  // With "none"/"estimated" (filtered), total/totalPages are lower-bound
  // estimates — drive pagers off hasNextPage, not totalPages. Defaults to
  // "exact" so existing callers are unchanged; list endpoints that don't display
  // a precise total should pass "none" or "estimated".
  countStrategy?: "exact" | "estimated" | "none";
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export abstract class CrudRepository<Entity extends PersistedEntity> {
  abstract create(data: DeepPartial<Entity>): Promise<Entity>;
  abstract findById(id: EntityId, relations?: string[]): Promise<Entity | null>;
  abstract findAll(relations?: string[]): Promise<Entity[]>;
  abstract findOneWhere(criteria: DeepPartial<Entity>): Promise<Entity | null>;
  abstract findManyWhere(criteria: DeepPartial<Entity>): Promise<Entity[]>;
  abstract findPage(
    criteria: DeepPartial<Entity>,
    options?: FindPageOptions<Entity>,
  ): Promise<PaginatedResult<Entity>>;
  abstract save(entity: Entity): Promise<Entity>;
  abstract remove(entity: Entity): Promise<void>;
  abstract count(criteria?: DeepPartial<Entity>): Promise<number>;
}
