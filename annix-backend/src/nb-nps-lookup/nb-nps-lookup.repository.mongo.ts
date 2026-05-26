import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";
import { NbNpsLookupRepository } from "./nb-nps-lookup.repository";

@Injectable()
export class MongoNbNpsLookupRepository
  extends MongoCrudRepository<NbNpsLookup>
  implements NbNpsLookupRepository
{
  constructor(@InjectModel("NbNpsLookup") model: Model<NbNpsLookup>) {
    super(model);
  }

  async findByNbMm(nbMm: number): Promise<NbNpsLookup | null> {
    const doc = await this.documents.findOne({ nb_mm: nbMm }).lean().exec();
    return this.toDomain(doc);
  }
}
