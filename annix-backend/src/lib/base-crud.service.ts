import { ConflictException, Logger, NotFoundException } from "@nestjs/common";
import type { DeepPartial, FindOptionsWhere, Repository } from "typeorm";
import { findOneOrFail } from "./entity-helpers";

export interface BaseCrudOptions {
  defaultRelations?: string[];
  entityName?: string;
}

export abstract class BaseCrudService<
  Entity extends { id: number },
  CreateDto = DeepPartial<Entity>,
  UpdateDto = DeepPartial<Entity>,
> {
  protected readonly logger: Logger;
  protected readonly entityName: string;
  protected readonly defaultRelations: string[];

  constructor(
    protected readonly repo: Repository<Entity>,
    options: BaseCrudOptions = {},
  ) {
    this.entityName = options.entityName ?? repo.metadata.targetName;
    this.defaultRelations = options.defaultRelations ?? [];
    this.logger = new Logger(`${this.entityName}Service`);
  }

  async create(dto: CreateDto): Promise<Entity> {
    const entity = this.repo.create(dto as DeepPartial<Entity>);
    return this.repo.save(entity);
  }

  async findAll(relations?: string[]): Promise<Entity[]> {
    return this.repo.find({ relations: relations ?? this.defaultRelations });
  }

  async findOne(id: number, relations?: string[]): Promise<Entity> {
    return findOneOrFail(
      this.repo,
      {
        where: { id } as FindOptionsWhere<Entity>,
        relations: relations ?? this.defaultRelations,
      },
      this.entityName,
    );
  }

  async update(id: number, dto: UpdateDto): Promise<Entity> {
    const entity = await this.findOne(id);
    Object.assign(entity as object, dto as object);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }

  protected async checkUnique(where: FindOptionsWhere<Entity>, message: string): Promise<void> {
    const exists = await this.repo.findOne({ where });
    if (exists) {
      throw new ConflictException(message);
    }
  }

  protected async checkUniqueExceptId(
    where: FindOptionsWhere<Entity>,
    excludeId: number,
    message: string,
  ): Promise<void> {
    const exists = await this.repo.findOne({ where });
    if (exists && exists.id !== excludeId) {
      throw new ConflictException(message);
    }
  }

  protected throwNotFound(id: number): never {
    throw new NotFoundException(`${this.entityName} ${id} not found`);
  }
}
