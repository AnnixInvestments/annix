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
