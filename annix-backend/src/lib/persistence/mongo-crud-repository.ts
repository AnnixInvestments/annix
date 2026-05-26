import { randomUUID } from "node:crypto";
import type { ClientSession, Model } from "mongoose";
import {
  CrudRepository,
  type DeepPartial,
  type EntityId,
  type PersistedEntity,
} from "./crud-repository";
import { MongoTransactionContext, type TransactionContext } from "./transaction-context";

type MongoDocument = Record<string, unknown>;

const COUNTERS_COLLECTION = "counters";

function toMongoShape(value: MongoDocument): MongoDocument {
  if (!("id" in value)) {
    return value;
  }
  const { id, ...rest } = value;
  return { _id: id, ...rest };
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

  protected toDomain(document: MongoDocument | null): Entity | null {
    if (!document) {
      return null;
    }
    const { _id, ...rest } = document;
    return { id: _id, ...rest } as unknown as Entity;
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
    if (incremented) {
      return incremented.seq;
    }
    const highest = await this.documents
      .findOne()
      .sort({ _id: -1 })
      .session(this.session)
      .lean()
      .exec();
    const start = highest ? Number(highest._id) : 0;
    await counters.updateOne(
      { _id: name },
      { $setOnInsert: { seq: start } },
      { upsert: true, ...this.sessionOption },
    );
    const seeded = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after", ...this.sessionOption },
    );
    return seeded ? seeded.seq : start + 1;
  }

  private async withGeneratedId(shaped: MongoDocument): Promise<MongoDocument> {
    if (shaped._id !== undefined && shaped._id !== null) {
      return shaped;
    }
    if (this.hasNumericId) {
      return { _id: await this.nextSequence(), ...shaped };
    }
    if (this.hasStringId) {
      return { _id: randomUUID(), ...shaped };
    }
    return shaped;
  }

  async create(data: DeepPartial<Entity>): Promise<Entity> {
    const ModelClass = this.documents;
    const shaped = await this.withGeneratedId(toMongoShape(data as MongoDocument));
    const document = new ModelClass(shaped);
    await document.save(this.sessionOption);
    return this.toDomain(document.toObject()) as Entity;
  }

  async findById(id: EntityId, relations: string[] = []): Promise<Entity | null> {
    const document = await this.documents
      .findById(id)
      .populate(relations)
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAll(relations: string[] = []): Promise<Entity[]> {
    const documents = await this.documents
      .find()
      .populate(relations)
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

  async save(entity: Entity): Promise<Entity> {
    const saved = await this.documents
      .findByIdAndUpdate(entity.id, toMongoShape(entity as unknown as MongoDocument), {
        new: true,
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
