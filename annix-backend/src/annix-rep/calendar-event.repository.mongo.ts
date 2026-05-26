import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CalendarEventRepository } from "./calendar-event.repository";
import { CalendarEvent } from "./entities/calendar-event.entity";

@Injectable()
export class MongoCalendarEventRepository
  extends MongoCrudRepository<CalendarEvent>
  implements CalendarEventRepository
{
  constructor(@InjectModel("CalendarEvent") model: Model<CalendarEvent>) {
    super(model);
  }

  async findOverlapsForUser(
    userId: number,
    today: Date,
    futureDate: Date,
  ): Promise<CalendarEvent[]> {
    const connectionModel = this.model.db.model<{ _id: number }>("CalendarConnection");
    const connections = await connectionModel.find({ userId }, { _id: 1 }).lean().exec();
    const connectionIds = connections.map((connection) => connection._id);
    const docs = await this.documents
      .find({
        connectionId: { $in: connectionIds },
        startTime: { $gte: today },
        endTime: { $lte: futureDate },
      })
      .populate("connection")
      .sort({ startTime: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findInRangeForConnections(
    connectionIds: number[],
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    const docs = await this.documents
      .find({
        connectionId: { $in: connectionIds },
        startTime: { $gte: startDate },
        endTime: { $lte: endDate },
      })
      .sort({ startTime: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByConnectionAndExternalId(
    connectionId: number,
    externalId: string,
  ): Promise<CalendarEvent | null> {
    const doc = await this.documents.findOne({ connectionId, externalId }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteByConnection(connectionId: number): Promise<void> {
    await this.documents.deleteMany({ connectionId }).exec();
  }

  async deleteByConnectionAndExternalId(connectionId: number, externalId: string): Promise<void> {
    await this.documents.deleteMany({ connectionId, externalId }).exec();
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.deleteOne({ _id: id }).exec();
  }

  async findWithConnection(id: number): Promise<CalendarEvent | null> {
    const doc = await this.documents.findById(id).populate("connection").lean().exec();
    return this.toDomain(doc);
  }
}
