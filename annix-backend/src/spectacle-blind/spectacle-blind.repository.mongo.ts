import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";
import { SpectacleBlindRepository } from "./spectacle-blind.repository";

@Injectable()
export class MongoSpectacleBlindRepository
  extends MongoCrudRepository<SpectacleBlind>
  implements SpectacleBlindRepository
{
  constructor(@InjectModel("SpectacleBlind") model: Model<SpectacleBlind>) {
    super(model);
  }

  async findAllOrdered(): Promise<SpectacleBlind[]> {
    const docs = await this.documents.find().sort({ pressureClass: 1, nps: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByPressureClass(pressureClass: string): Promise<SpectacleBlind[]> {
    const docs = await this.documents.find({ pressureClass }).sort({ nps: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByNpsAndClass(nps: string, pressureClass: string): Promise<SpectacleBlind | null> {
    const doc = await this.documents.findOne({ nps, pressureClass }).lean().exec();
    return this.toDomain(doc);
  }
}
