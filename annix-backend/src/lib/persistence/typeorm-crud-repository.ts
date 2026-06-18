import {
  type FindOptionsOrder,
  type FindOptionsSelect,
  type FindOptionsWhere,
  type Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import type { PaginatedResult } from "../dto/pagination-query.dto";
import {
  CrudRepository,
  type DeepPartial,
  type EntityId,
  type FindPageOptions,
  type PersistedEntity,
} from "./crud-repository";
import { type TransactionContext, TypeOrmTransactionContext } from "./transaction-context";

export class TypeOrmCrudRepository<Entity extends PersistedEntity> extends CrudRepository<Entity> {
  constructor(protected readonly repository: Repository<Entity>) {
    super();
  }

  create(data: DeepPartial<Entity>): Promise<Entity> {
    const entity = this.repository.create(data as TypeOrmDeepPartial<Entity>);
    return this.repository.save(entity);
  }

  findById(id: EntityId, relations: string[] = []): Promise<Entity | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<Entity>,
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findAll(relations: string[] = []): Promise<Entity[]> {
    return this.repository.find(relations.length > 0 ? { relations } : {});
  }

  findOneWhere(criteria: DeepPartial<Entity>): Promise<Entity | null> {
    return this.repository.findOne({ where: criteria as FindOptionsWhere<Entity> });
  }

  findManyWhere(criteria: DeepPartial<Entity>): Promise<Entity[]> {
    return this.repository.find({ where: criteria as FindOptionsWhere<Entity> });
  }

  async findPage(
    criteria: DeepPartial<Entity>,
    options: FindPageOptions<Entity> = {},
  ): Promise<PaginatedResult<Entity>> {
    if (options.filter || options.excludeFields) {
      throw new Error(
        "findPage filter/excludeFields options are Mongo-only; the Postgres driver does not support raw filters",
      );
    }
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 25));
    const order = options.sort
      ? (Object.fromEntries(
          Object.entries(options.sort).map(([field, direction]) => [field, direction]),
        ) as FindOptionsOrder<Entity>)
      : undefined;
    const select =
      options.projection && options.projection.length > 0
        ? (Object.fromEntries(
            options.projection.map((field) => [field, true]),
          ) as FindOptionsSelect<Entity>)
        : undefined;

    const [items, total] = await this.repository.findAndCount({
      where: criteria as FindOptionsWhere<Entity>,
      skip: (page - 1) * limit,
      take: limit,
      ...(order ? { order } : {}),
      ...(select ? { select } : {}),
      ...(options.relations && options.relations.length > 0
        ? { relations: options.relations }
        : {}),
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  save(entity: Entity): Promise<Entity> {
    return this.repository.save(entity);
  }

  async remove(entity: Entity): Promise<void> {
    await this.repository.remove(entity);
  }

  count(criteria: DeepPartial<Entity> = {}): Promise<number> {
    return this.repository.count({ where: criteria as FindOptionsWhere<Entity> });
  }

  withTransaction(context: TransactionContext): TypeOrmCrudRepository<Entity> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("TypeOrmCrudRepository requires a TypeOrmTransactionContext");
    }
    return new TypeOrmCrudRepository<Entity>(
      context.manager.getRepository<Entity>(this.repository.target),
    );
  }
}
