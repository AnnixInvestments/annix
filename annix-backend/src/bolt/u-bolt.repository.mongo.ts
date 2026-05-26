import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { UBoltEntity } from "./entities/u-bolt.entity";
import { UBoltRepository } from "./u-bolt.repository";

@Injectable()
export class MongoUBoltRepository
  extends MongoCrudRepository<UBoltEntity>
  implements UBoltRepository
{
  constructor(@InjectModel("UBoltEntity") model: Model<UBoltEntity>) {
    super(model);
  }

  async uBolts(nbMm?: number): Promise<UBoltEntity[]> {
    const filter: Record<string, unknown> = {};
    if (nbMm) {
      filter.nbMm = nbMm;
    }
    const docs = await this.documents.find(filter).sort({ nbMm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async uBolt(nbMm: number, threadSize?: string): Promise<UBoltEntity | null> {
    const filter: Record<string, unknown> = { nbMm };
    if (threadSize) {
      filter.threadSize = threadSize;
    }
    const doc = await this.documents.findOne(filter).lean().exec();
    return this.toDomain(doc);
  }
}
