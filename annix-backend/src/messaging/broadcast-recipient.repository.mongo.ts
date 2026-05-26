import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BroadcastRecipientRepository } from "./broadcast-recipient.repository";
import { BroadcastRecipient } from "./entities/broadcast-recipient.entity";

@Injectable()
export class MongoBroadcastRecipientRepository
  extends MongoCrudRepository<BroadcastRecipient>
  implements BroadcastRecipientRepository
{
  constructor(@InjectModel("BroadcastRecipient") model: Model<BroadcastRecipient>) {
    super(model);
  }

  async findByBroadcastAndUser(
    broadcastId: number,
    userId: number,
  ): Promise<BroadcastRecipient | null> {
    const document = await this.documents.findOne({ broadcastId, userId }).lean().exec();
    return this.toDomain(document);
  }

  async findByUser(userId: number): Promise<BroadcastRecipient[]> {
    const documents = await this.documents
      .find({ userId }, { broadcastId: 1, readAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  countUnreadForUser(userId: number): Promise<number> {
    return this.documents.countDocuments({ userId, readAt: null }).exec();
  }

  countReadForBroadcast(broadcastId: number): Promise<number> {
    return this.documents.countDocuments({ broadcastId, readAt: { $ne: null } }).exec();
  }

  countEmailSentForBroadcast(broadcastId: number): Promise<number> {
    return this.documents.countDocuments({ broadcastId, emailSentAt: { $ne: null } }).exec();
  }

  async updateEmailSentAt(
    broadcastId: number,
    userIds: number[],
    emailSentAt: Date,
  ): Promise<void> {
    await this.documents
      .updateMany({ broadcastId, userId: { $in: userIds } }, { emailSentAt })
      .exec();
  }
}
