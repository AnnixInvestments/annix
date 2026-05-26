import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Bolt } from "../bolt/entities/bolt.entity";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Washer } from "./entities/washer.entity";
import { WasherFilters, WasherRepository } from "./washer.repository";

@Injectable()
export class MongoWasherRepository extends MongoCrudRepository<Washer> implements WasherRepository {
  constructor(@InjectModel("Washer") model: Model<Washer>) {
    super(model);
  }

  private get boltModel(): Model<Bolt> {
    return this.model.db.model<Bolt>("Bolt");
  }

  private get bolts() {
    return this.boltModel as unknown as Model<Record<string, unknown>>;
  }

  async findBoltById(id: number): Promise<Bolt | null> {
    const doc = await this.bolts.findOne({ _id: id }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as Bolt;
  }

  async findAllFiltered(filters?: WasherFilters): Promise<Washer[]> {
    const filter: Record<string, unknown> = {};
    if (filters?.boltId) {
      filter.boltId = filters.boltId;
    }
    if (filters?.type) {
      filter.type = filters.type;
    }
    if (filters?.material) {
      filter.material = { $regex: filters.material, $options: "i" };
    }
    const docs = await this.documents.find(filter).sort({ boltId: 1, type: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneWithBolt(id: number): Promise<Washer | null> {
    const doc = await this.documents.findOne({ _id: id }).lean().exec();
    return this.toDomain(doc);
  }

  async findByBoltDesignation(designation: string, type?: string): Promise<Washer[]> {
    const boltDoc = await this.bolts.findOne({ designation }).lean().exec();
    if (!boltDoc) {
      return [];
    }
    const boltId = boltDoc._id as number;
    const filter: Record<string, unknown> = { boltId };
    if (type) {
      filter.type = type;
    }
    const docs = await this.documents.find(filter).lean().exec();
    return this.toDomainList(docs);
  }

  async typesGrouped(): Promise<Array<{ type: string; count: number }>> {
    const rows = await this.documents
      .aggregate<{ _id: string; count: number }>([
        { $match: { type: { $ne: null } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ])
      .exec();
    return rows.map((row) => ({ type: row._id, count: row.count }));
  }

  async boltDesignationsForType(type: string): Promise<Array<{ size: string }>> {
    const rows = await this.documents
      .aggregate<{ _id: string }>([
        { $match: { type } },
        {
          $lookup: {
            from: this.bolts.collection.collectionName,
            localField: "boltId",
            foreignField: "_id",
            as: "bolt",
          },
        },
        { $unwind: "$bolt" },
        { $group: { _id: "$bolt.designation" } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((row) => ({ size: row._id }));
  }
}
