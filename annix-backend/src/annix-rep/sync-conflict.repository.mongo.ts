import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SyncConflict } from "./entities/sync-conflict.entity";
import { SyncConflictRepository } from "./sync-conflict.repository";

@Injectable()
export class MongoSyncConflictRepository
  extends MongoCrudRepository<SyncConflict>
  implements SyncConflictRepository
{
  constructor(@InjectModel("SyncConflict") model: Model<SyncConflict>) {
    super(model);
  }

  async findPendingForPair(
    userId: number,
    meetingId: number,
    calendarEventId: number,
  ): Promise<SyncConflict | null> {
    const doc = await this.documents
      .findOne({ userId, meetingId, calendarEventId, resolution: "pending" })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingForUser(userId: number): Promise<SyncConflict[]> {
    const docs = await this.documents
      .find({ userId, resolution: "pending" })
      .populate(["meeting", "calendarEvent"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdAndUser(id: number, userId: number): Promise<SyncConflict | null> {
    const doc = await this.documents
      .findOne({ _id: id, userId })
      .populate(["meeting", "calendarEvent"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  countPendingForUser(userId: number): Promise<number> {
    return this.documents.countDocuments({ userId, resolution: "pending" }).exec();
  }
}
