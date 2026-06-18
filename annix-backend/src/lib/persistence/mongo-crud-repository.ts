import { randomUUID } from "node:crypto";
import type { ClientSession, Model, Schema } from "mongoose";
import type { PaginatedResult } from "../dto/pagination-query.dto";
import {
  CrudRepository,
  type DeepPartial,
  type EntityId,
  type FindPageOptions,
  type PersistedEntity,
} from "./crud-repository";
import { nestPopulate } from "./nest-populate";
import { MongoTransactionContext, type TransactionContext } from "./transaction-context";

type MongoDocument = Record<string, unknown>;

const COUNTERS_COLLECTION = "counters";

const MAX_RELATION_MAPPING_DEPTH = 4;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

const relationRefsCache = new WeakMap<Schema, Map<string, string>>();

function relationRefs(schema: Schema): Map<string, string> {
  const cached = relationRefsCache.get(schema);
  if (cached) {
    return cached;
  }
  const refs = new Map<string, string>();
  const virtuals = (
    schema as unknown as {
      virtuals: Record<string, { options?: { ref?: string } }>;
    }
  ).virtuals;
  Object.entries(virtuals).forEach(([name, virtual]) => {
    const ref = virtual.options?.ref;
    if (ref) {
      refs.set(name, ref);
    }
  });
  Object.entries(schema.paths).forEach(([name, path]) => {
    const ref = (path as { options?: { ref?: string } }).options?.ref;
    if (typeof ref === "string") {
      refs.set(name, ref);
    }
  });
  relationRefsCache.set(schema, refs);
  return refs;
}

function toMongoShape(value: MongoDocument): MongoDocument {
  if (!("id" in value)) {
    return value;
  }
  const { id, ...rest } = value;
  return { _id: id, ...rest };
}

// Belongs-to virtuals: relation name -> the scalar FK path on THIS document
// (e.g. createdBy -> createdById). Services written for TypeORM pass whole
// relation objects (createdBy: user); mongoose silently DROPS virtuals on
// save, so without this mapping the document persists with NO foreign key —
// the root cause of ownerless drafts/RFQs (403s) and orphaned child rows.
type BelongsToMeta = { localField: string };

const belongsToCache = new WeakMap<Schema, Map<string, BelongsToMeta>>();

function belongsToRelations(schema: Schema): Map<string, BelongsToMeta> {
  const cached = belongsToCache.get(schema);
  if (cached) {
    return cached;
  }
  const map = new Map<string, BelongsToMeta>();
  const virtuals = (
    schema as unknown as {
      virtuals: Record<
        string,
        {
          options?: { ref?: string; localField?: string; foreignField?: string; justOne?: boolean };
        }
      >;
    }
  ).virtuals;
  Object.entries(virtuals).forEach(([name, virtual]) => {
    const options = virtual.options;
    if (
      options?.ref &&
      options.justOne === true &&
      options.localField &&
      options.localField !== "_id" &&
      options.foreignField === "_id"
    ) {
      map.set(name, { localField: options.localField });
    }
  });
  belongsToCache.set(schema, map);
  return map;
}

function mapRelationObjectsToFks(schema: Schema, value: MongoDocument): MongoDocument {
  const relations = belongsToRelations(schema);
  if (relations.size === 0) {
    return value;
  }
  let out: MongoDocument | null = null;
  for (const [name, meta] of relations) {
    if (!(name in value)) continue;
    out = out ?? { ...value };
    const related = out[name] as { id?: unknown; _id?: unknown } | null | undefined;
    delete out[name];
    if (related && typeof related === "object" && out[meta.localField] === undefined) {
      const relatedId = related.id ?? related._id;
      if (relatedId !== undefined && relatedId !== null) {
        out[meta.localField] = relatedId;
      }
    }
  }
  return out ?? value;
}

export class MongoCrudRepository<Entity extends PersistedEntity> extends CrudRepository<Entity> {
  constructor(
    protected readonly model: Model<Entity>,
    protected readonly session: ClientSession | null = null,
  ) {
    super();
  }

  protected get documents(): Model<MongoDocument> {
    return this.model as unknown as Model<MongoDocument>;
  }

  private get sessionOption(): { session: ClientSession } | Record<string, never> {
    return this.session ? { session: this.session } : {};
  }

  private cachedDateFields: string[] | null = null;

  private get dateFields(): string[] {
    if (this.cachedDateFields === null) {
      const schemaDateFields = Object.entries(this.model.schema.paths)
        .filter(([, type]) => (type as { instance?: string }).instance === "Date")
        .map(([path]) => path);
      this.cachedDateFields = Array.from(
        new Set([...schemaDateFields, "createdAt", "updatedAt", "deletedAt"]),
      );
    }
    return this.cachedDateFields;
  }

  protected toDomain(document: MongoDocument | null): Entity | null {
    if (!document) {
      return null;
    }
    const { _id, ...rest } = document;
    const entity = { id: _id, ...rest } as MongoDocument;
    for (const field of this.dateFields) {
      const value = entity[field];
      if (typeof value === "string") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          entity[field] = parsed;
        }
      }
    }
    this.mapPopulatedRelationIds(entity, this.model.schema, 0);
    return entity as unknown as Entity;
  }

  private mapPopulatedRelationIds(entity: MongoDocument, schema: Schema, depth: number): void {
    if (depth >= MAX_RELATION_MAPPING_DEPTH) {
      return;
    }
    relationRefs(schema).forEach((ref, key) => {
      const value = entity[key];
      if (!value || typeof value !== "object") {
        return;
      }
      const childSchema = this.model.db.models[ref] ? this.model.db.models[ref].schema : null;
      entity[key] = Array.isArray(value)
        ? value.map((child) => this.withMappedChildId(child as MongoDocument, childSchema, depth))
        : this.withMappedChildId(value as MongoDocument, childSchema, depth);
    });
  }

  private withMappedChildId(
    child: MongoDocument | null,
    schema: Schema | null,
    depth: number,
  ): MongoDocument | null {
    if (!child || typeof child !== "object" || !("_id" in child)) {
      return child;
    }
    const mapped = { id: child._id, ...child };
    if (schema) {
      this.mapPopulatedRelationIds(mapped, schema, depth + 1);
    }
    return mapped;
  }

  protected toDomainList(documents: MongoDocument[]): Entity[] {
    return documents.map((document) => this.toDomain(document) as Entity);
  }

  private get hasNumericId(): boolean {
    return this.model.schema.path("_id")?.instance === "Number";
  }

  private get hasStringId(): boolean {
    return this.model.schema.path("_id")?.instance === "String";
  }

  private counters() {
    const database = this.model.db.db;
    if (!database) {
      throw new Error("Mongo connection is not ready for id sequencing");
    }
    return database.collection<{ _id: string; seq: number }>(COUNTERS_COLLECTION);
  }

  private async nextSequence(): Promise<number> {
    const name = this.model.collection.collectionName;
    const counters = this.counters();
    const incremented = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after", ...this.sessionOption },
    );
    if (incremented && Number.isFinite(incremented.seq)) {
      return incremented.seq;
    }
    return this.reseedSequence(name);
  }

  private async reseedSequence(name: string): Promise<number> {
    const highest = await this.documents
      .find({ _id: { $type: "number" } })
      .sort({ _id: -1 })
      .limit(1)
      .session(this.session)
      .lean()
      .exec();
    const parsed = highest.length > 0 ? Number(highest[0]._id) : 0;
    const start = Number.isFinite(parsed) ? parsed : 0;
    const next = start + 1;
    await this.counters().updateOne(
      { _id: name },
      { $set: { seq: next } },
      { upsert: true, ...this.sessionOption },
    );
    return next;
  }

  private async withGeneratedId(shaped: MongoDocument): Promise<MongoDocument> {
    if (shaped._id !== undefined && shaped._id !== null) {
      return shaped;
    }
    if (this.hasNumericId) {
      return { ...shaped, _id: await this.nextSequence() };
    }
    if (this.hasStringId) {
      return { ...shaped, _id: randomUUID() };
    }
    return shaped;
  }

  async create(data: DeepPartial<Entity>): Promise<Entity> {
    const ModelClass = this.documents;
    const shaped = await this.withGeneratedId(
      toMongoShape(mapRelationObjectsToFks(this.model.schema, data as MongoDocument)),
    );
    const document = new ModelClass(shaped);
    await document.save(this.sessionOption);
    return this.toDomain(document.toObject()) as Entity;
  }

  async findById(id: EntityId, relations: string[] = []): Promise<Entity | null> {
    const document = await this.documents
      .findById(id)
      .populate(nestPopulate(relations))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAll(relations: string[] = []): Promise<Entity[]> {
    const documents = await this.documents
      .find()
      .populate(nestPopulate(relations))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findOneWhere(criteria: DeepPartial<Entity>): Promise<Entity | null> {
    const document = await this.documents
      .findOne(toMongoShape(criteria as MongoDocument))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findManyWhere(criteria: DeepPartial<Entity>): Promise<Entity[]> {
    const documents = await this.documents
      .find(toMongoShape(criteria as MongoDocument))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findPage(
    criteria: DeepPartial<Entity>,
    options: FindPageOptions<Entity> = {},
  ): Promise<PaginatedResult<Entity>> {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const finalFilter = { ...toMongoShape(criteria as MongoDocument), ...(options.filter ?? {}) };
    const sort: Record<string, 1 | -1> | null = options.sort
      ? Object.fromEntries(
          Object.entries(options.sort).map(([field, direction]) => [
            field,
            direction === "ASC" ? 1 : -1,
          ]),
        )
      : null;

    const query = this.documents
      .find(finalFilter)
      .populate(nestPopulate(options.relations ?? []))
      .skip((page - 1) * limit)
      .limit(limit)
      .allowDiskUse(true)
      .session(this.session)
      .lean();

    if (sort) {
      query.sort(sort);
    }
    if (options.excludeFields && options.excludeFields.length > 0) {
      query.select(options.excludeFields.map((field) => `-${field}`).join(" "));
    } else if (options.projection && options.projection.length > 0) {
      query.select(options.projection.join(" "));
    }

    const [documents, total] = await Promise.all([
      query.exec(),
      this.documents.countDocuments(finalFilter).session(this.session).exec(),
    ]);

    return {
      items: this.toDomainList(documents),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async save(entity: Entity): Promise<Entity> {
    const shaped = await this.withGeneratedId(
      toMongoShape(mapRelationObjectsToFks(this.model.schema, entity as unknown as MongoDocument)),
    );
    const saved = await this.documents
      .findByIdAndUpdate(shaped._id, shaped, {
        returnDocument: "after",
        upsert: true,
        ...this.sessionOption,
      })
      .lean()
      .exec();
    return this.toDomain(saved) as Entity;
  }

  async remove(entity: Entity): Promise<void> {
    await this.documents.findByIdAndDelete(entity.id, this.sessionOption).exec();
  }

  count(criteria: DeepPartial<Entity> = {}): Promise<number> {
    return this.documents
      .countDocuments(toMongoShape(criteria as MongoDocument))
      .session(this.session)
      .exec();
  }

  withTransaction(context: TransactionContext): MongoCrudRepository<Entity> {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoCrudRepository requires a MongoTransactionContext");
    }
    return new MongoCrudRepository<Entity>(this.model, context.session);
  }
}
