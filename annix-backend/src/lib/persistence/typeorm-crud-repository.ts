import {
  type FindOptionsWhere,
  type Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import {
  CrudRepository,
  type DeepPartial,
  type EntityId,
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
