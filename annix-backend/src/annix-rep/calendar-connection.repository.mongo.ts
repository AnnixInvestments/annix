import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CalendarConnectionRepository } from "./calendar-connection.repository";
import { CalendarConnection, CalendarSyncStatus } from "./entities/calendar-connection.entity";
import { CalendarProvider } from "./entities/calendar-event.entity";

@Injectable()
export class MongoCalendarConnectionRepository
  extends MongoCrudRepository<CalendarConnection>
  implements CalendarConnectionRepository
{
  constructor(@InjectModel("CalendarConnection") model: Model<CalendarConnection>) {
    super(model);
  }

  async findBySyncStatuses(statuses: CalendarSyncStatus[]): Promise<CalendarConnection[]> {
    const docs = await this.documents
      .find({ syncStatus: { $in: statuses } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByUser(userId: number): Promise<CalendarConnection[]> {
    const docs = await this.documents.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdAndUser(id: number, userId: number): Promise<CalendarConnection | null> {
    const doc = await this.documents.findOne({ _id: id, userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUserProviderEmail(
    userId: number,
    provider: CalendarProvider,
    accountEmail: string,
  ): Promise<CalendarConnection | null> {
    const doc = await this.documents.findOne({ userId, provider, accountEmail }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveByUser(userId: number): Promise<CalendarConnection[]> {
    const docs = await this.documents
      .find({ userId, syncStatus: CalendarSyncStatus.ACTIVE })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async clearPrimaryForUser(userId: number): Promise<void> {
    await this.documents.updateMany({ userId }, { $set: { isPrimary: false } }).exec();
  }
}
