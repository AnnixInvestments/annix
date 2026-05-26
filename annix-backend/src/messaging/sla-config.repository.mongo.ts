import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SlaConfig } from "./entities/sla-config.entity";
import { SlaConfigRepository } from "./sla-config.repository";

@Injectable()
export class MongoSlaConfigRepository
  extends MongoCrudRepository<SlaConfig>
  implements SlaConfigRepository
{
  constructor(@InjectModel("SlaConfig") model: Model<SlaConfig>) {
    super(model);
  }

  async findFirst(): Promise<SlaConfig | null> {
    const document = await this.documents.findOne().lean().exec();
    return this.toDomain(document);
  }
}
