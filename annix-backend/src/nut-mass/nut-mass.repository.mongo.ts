import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Bolt } from "../bolt/entities/bolt.entity";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NutMass } from "./entities/nut-mass.entity";
import { NutMassRepository } from "./nut-mass.repository";

@Injectable()
export class MongoNutMassRepository
  extends MongoCrudRepository<NutMass>
  implements NutMassRepository
{
  constructor(@InjectModel("NutMass") model: Model<NutMass>) {
    super(model);
  }

  private get boltModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("Bolt");
  }

  async findAllWithBolt(): Promise<NutMass[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findOneWithBolt(id: number): Promise<NutMass | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findExisting(boltId: number, mass_kg: number): Promise<NutMass | null> {
    const doc = await this.documents.findOne({ boltId, mass_kg }).lean().exec();
    return this.toDomain(doc);
  }

  async findByBoltId(boltId: number): Promise<NutMass | null> {
    const doc = await this.documents.findOne({ boltId }).lean().exec();
    return this.toDomain(doc);
  }

  async findBolt(id: number): Promise<Bolt | null> {
    const doc = await this.boltModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as Bolt;
  }

  async createNut(data: Partial<NutMass>): Promise<NutMass> {
    return this.create(data);
  }

  async saveNut(entity: NutMass): Promise<NutMass> {
    return this.save(entity);
  }

  async removeNut(entity: NutMass): Promise<void> {
    return this.remove(entity);
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
            from: this.boltModel.collection.collectionName,
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

  async gradesForTypeAndSize(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    const rows = await this.documents
      .aggregate<{ _id: string | null }>([
        { $match: { type } },
        {
          $lookup: {
            from: this.boltModel.collection.collectionName,
            localField: "boltId",
            foreignField: "_id",
            as: "bolt",
          },
        },
        { $unwind: "$bolt" },
        { $match: { "bolt.designation": size } },
        { $group: { _id: "$grade" } },
      ])
      .exec();
    return rows.map((row) => ({ grade: row._id, material: "Carbon Steel" }));
  }
}
