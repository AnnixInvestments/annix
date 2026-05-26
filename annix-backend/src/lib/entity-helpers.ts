import { NotFoundException } from "@nestjs/common";
import type { FindOneOptions, Repository } from "typeorm";
import type {
  CrudRepository,
  DeepPartial,
  EntityId,
  PersistedEntity,
} from "./persistence/crud-repository";

export async function findOneOrFail<T extends object>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  entityName: string,
): Promise<T> {
  const entity = await repo.findOne(options);
  if (!entity) {
    const whereClause = options.where ? ` ${JSON.stringify(options.where)}` : "";
    throw new NotFoundException(`${entityName}${whereClause} not found`);
  }
  return entity;
}

export async function findByIdOrFail<T extends PersistedEntity>(
  repo: CrudRepository<T>,
  id: EntityId,
  entityName: string,
  relations?: string[],
): Promise<T> {
  const entity = await repo.findById(id, relations);
  if (!entity) {
    throw new NotFoundException(`${entityName} ${JSON.stringify({ id })} not found`);
  }
  return entity;
}

export async function findOneWhereOrFail<T extends PersistedEntity>(
  repo: CrudRepository<T>,
  criteria: DeepPartial<T>,
  entityName: string,
): Promise<T> {
  const entity = await repo.findOneWhere(criteria);
  if (!entity) {
    throw new NotFoundException(`${entityName} ${JSON.stringify(criteria)} not found`);
  }
  return entity;
}
