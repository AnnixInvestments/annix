import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";
import { InboundEmailConfigRepository } from "./inbound-email-config.repository";

@Injectable()
export class MongoInboundEmailConfigRepository
  extends MongoCrudRepository<InboundEmailConfig>
  implements InboundEmailConfigRepository
{
  constructor(@InjectModel("InboundEmailConfig") model: Model<InboundEmailConfig>) {
    super(model);
  }

  async findByAppAndCompany(app: string, companyId: number): Promise<InboundEmailConfig | null> {
    const document = await this.documents.findOne({ app, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findAllEnabled(): Promise<InboundEmailConfig[]> {
    const documents = await this.documents.find({ enabled: true }).lean().exec();
    return this.toDomainList(documents);
  }

  async updateLastPoll(id: number, lastPollAt: Date, lastError: string | null): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { lastPollAt, lastError }).exec();
  }
}
