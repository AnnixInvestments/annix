import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelNotificationPreferences } from "./entities/notification-preferences.entity";
import { AnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository";

@Injectable()
export class MongoAnnixSentinelNotificationPreferencesRepository
  extends MongoCrudRepository<AnnixSentinelNotificationPreferences>
  implements AnnixSentinelNotificationPreferencesRepository
{
  constructor(
    @InjectModel("AnnixSentinelNotificationPreferences")
    model: Model<AnnixSentinelNotificationPreferences>,
  ) {
    super(model);
  }

  async findByUserIds(userIds: number[]): Promise<AnnixSentinelNotificationPreferences[]> {
    const documents = await this.documents
      .find({ userId: { $in: userIds } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findOneByUserId(userId: number): Promise<AnnixSentinelNotificationPreferences | null> {
    const document = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(document);
  }
}
