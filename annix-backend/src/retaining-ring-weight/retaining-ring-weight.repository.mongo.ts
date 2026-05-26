import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RetainingRingWeight } from "./entities/retaining-ring-weight.entity";
import { RetainingRingWeightRepository } from "./retaining-ring-weight.repository";

@Injectable()
export class MongoRetainingRingWeightRepository
  extends MongoCrudRepository<RetainingRingWeight>
  implements RetainingRingWeightRepository
{
  constructor(@InjectModel("RetainingRingWeight") model: Model<RetainingRingWeight>) {
    super(model);
  }

  async findAllOrdered(): Promise<RetainingRingWeight[]> {
    const docs = await this.documents.find().sort({ nominal_bore_mm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByNominalBore(nominalBoreMm: number): Promise<RetainingRingWeight | null> {
    const doc = await this.documents.findOne({ nominal_bore_mm: nominalBoreMm }).lean().exec();
    return this.toDomain(doc);
  }
}
