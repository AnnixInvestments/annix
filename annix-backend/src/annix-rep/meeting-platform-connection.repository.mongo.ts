import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  MeetingPlatform,
  MeetingPlatformConnection,
  PlatformConnectionStatus,
} from "./entities/meeting-platform-connection.entity";
import { MeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository";

@Injectable()
export class MongoMeetingPlatformConnectionRepository
  extends MongoCrudRepository<MeetingPlatformConnection>
  implements MeetingPlatformConnectionRepository
{
  constructor(@InjectModel("MeetingPlatformConnection") model: Model<MeetingPlatformConnection>) {
    super(model);
  }

  async findByUser(userId: number): Promise<MeetingPlatformConnection[]> {
    const docs = await this.documents.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdAndUser(id: number, userId: number): Promise<MeetingPlatformConnection | null> {
    const doc = await this.documents.findOne({ _id: id, userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUserAndPlatform(
    userId: number,
    platform: MeetingPlatform,
  ): Promise<MeetingPlatformConnection | null> {
    const doc = await this.documents.findOne({ userId, platform }).lean().exec();
    return this.toDomain(doc);
  }

  async findActive(): Promise<MeetingPlatformConnection[]> {
    const docs = await this.documents
      .find({ connectionStatus: PlatformConnectionStatus.ACTIVE })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findNeedingTokenRefresh(threshold: Date): Promise<MeetingPlatformConnection[]> {
    const docs = await this.documents
      .find({
        connectionStatus: PlatformConnectionStatus.ACTIVE,
        tokenExpiresAt: { $ne: null, $lt: threshold },
        refreshTokenEncrypted: { $ne: null },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveByPlatformAccount(
    platform: MeetingPlatform,
    accountId: string,
  ): Promise<MeetingPlatformConnection | null> {
    const doc = await this.documents
      .findOne({
        platform,
        accountId,
        connectionStatus: PlatformConnectionStatus.ACTIVE,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async markError(
    connectionId: number,
    updates: Partial<MeetingPlatformConnection>,
  ): Promise<void> {
    await this.documents
      .updateOne({ _id: connectionId }, { $set: updates as Record<string, unknown> })
      .exec();
  }
}
