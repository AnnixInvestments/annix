import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelNotification } from "./entities/notification.entity";
import { AnnixSentinelNotificationRepository } from "./notification.repository";

@Injectable()
export class MongoAnnixSentinelNotificationRepository
  extends MongoCrudRepository<AnnixSentinelNotification>
  implements AnnixSentinelNotificationRepository
{
  constructor(@InjectModel("AnnixSentinelNotification") model: Model<AnnixSentinelNotification>) {
    super(model);
  }

  async findUnreadForUser(userId: number): Promise<AnnixSentinelNotification[]> {
    const documents = await this.documents
      .find({ userId, readAt: null })
      .sort({ sentAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
