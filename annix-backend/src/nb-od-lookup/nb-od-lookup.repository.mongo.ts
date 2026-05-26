import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NbOdLookup } from "./entities/nb-od-lookup.entity";
import { NbOdLookupRepository } from "./nb-od-lookup.repository";

@Injectable()
export class MongoNbOdLookupRepository
  extends MongoCrudRepository<NbOdLookup>
  implements NbOdLookupRepository
{
  constructor(@InjectModel("NbOdLookup") model: Model<NbOdLookup>) {
    super(model);
  }

  async findAllOrdered(): Promise<NbOdLookup[]> {
    const docs = await this.documents.find().sort({ nominal_bore_mm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByNominalBore(nominalBoreMm: number): Promise<NbOdLookup | null> {
    const doc = await this.documents.findOne({ nominal_bore_mm: nominalBoreMm }).lean().exec();
    return this.toDomain(doc);
  }

  async allNominalBores(): Promise<{ nominalBoreMm: number }[]> {
    const values = await this.documents.distinct("nominal_bore_mm").exec();
    const sorted = (values as number[]).sort((a, b) => a - b);
    return sorted.map((nominalBoreMm) => ({ nominalBoreMm }));
  }
}
