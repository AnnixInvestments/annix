import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SageConnection } from "./entities/sage-connection.entity";
import { SageConnectionRepository } from "./sage-connection.repository";

@Injectable()
export class MongoSageConnectionRepository
  extends MongoCrudRepository<SageConnection>
  implements SageConnectionRepository
{
  constructor(@InjectModel("SageConnection") model: Model<SageConnection>) {
    super(model);
  }

  instantiate(data: DeepPartial<SageConnection>): SageConnection {
    return { ...data } as SageConnection;
  }

  async findByAppKey(appKey: string): Promise<SageConnection | null> {
    const document = await this.documents.findOne({ appKey }).lean().exec();
    return this.toDomain(document);
  }

  async updateByAppKey(appKey: string, patch: DeepPartial<SageConnection>): Promise<void> {
    await this.documents.updateOne({ appKey }, { $set: patch as Record<string, unknown> }).exec();
  }
}
