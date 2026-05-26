import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BoltMassRepository } from "./bolt-mass.repository";
import { BoltMass } from "./entities/bolt-mass.entity";

@Injectable()
export class MongoBoltMassRepository
  extends MongoCrudRepository<BoltMass>
  implements BoltMassRepository
{
  constructor(@InjectModel("BoltMass") model: Model<BoltMass>) {
    super(model);
  }

  async findClosestByBoltAndMinLength(
    boltId: number,
    minLengthMm: number,
  ): Promise<BoltMass | null> {
    const doc = await this.documents
      .findOne({ boltId, length_mm: { $gte: minLengthMm } })
      .sort({ length_mm: 1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
