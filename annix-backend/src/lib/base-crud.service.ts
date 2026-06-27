import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { CrudRepository, type DeepPartial } from "./persistence/crud-repository";

export interface BaseCrudOptions {
  entityName: string;
  defaultRelations?: string[];
}

// Fields a generic update DTO must never overwrite — identity, tenant ownership
// and creation provenance (#404 architecture-7). A malicious or sloppy DTO
// carrying e.g. companyId would otherwise silently re-tenant the row.
const PROTECTED_UPDATE_FIELDS = new Set([
  "id",
  "_id",
  "companyId",
  "ownerId",
  "createdById",
  "createdAt",
]);

export abstract class BaseCrudService<
  Entity extends { id: number },
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
> {
  protected readonly logger: Logger;
  protected readonly entityName: string;
  protected readonly defaultRelations: string[];

  constructor(
    protected readonly repository: CrudRepository<Entity>,
    options: BaseCrudOptions,
  ) {
    this.entityName = options.entityName;
    this.defaultRelations = options.defaultRelations ?? [];
    this.logger = new Logger(`${this.entityName}Service`);
  }

  async create(dto: CreateDto): Promise<Entity> {
    return this.repository.create(dto as unknown as DeepPartial<Entity>);
  }

  async findAll(relations?: string[]): Promise<Entity[]> {
    return this.repository.findAll(relations ?? this.defaultRelations);
  }

  async findOne(id: number, relations?: string[]): Promise<Entity> {
    const entity = await this.repository.findById(id, relations ?? this.defaultRelations);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateDto): Promise<Entity> {
    const entity = await this.findOne(id);
    const safeUpdates = Object.fromEntries(
      Object.entries(dto as Record<string, unknown>).filter(
        ([key]) => !PROTECTED_UPDATE_FIELDS.has(key),
      ),
    );
    Object.assign(entity as object, safeUpdates);
    return this.repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
  }

  protected async checkUnique(where: Record<string, unknown>, message: string): Promise<void> {
    const exists = await this.repository.findOneWhere(where as unknown as DeepPartial<Entity>);
    if (exists) {
      throw new BadRequestException(message);
    }
  }

  protected async checkUniqueExceptId(
    where: Record<string, unknown>,
    excludeId: number,
    message: string,
  ): Promise<void> {
    const exists = await this.repository.findOneWhere(where as unknown as DeepPartial<Entity>);
    if (exists && exists.id !== excludeId) {
      throw new BadRequestException(message);
    }
  }

  protected throwNotFound(id: number): never {
    throw new NotFoundException(`${this.entityName} ${id} not found`);
  }
}
