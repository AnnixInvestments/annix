import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberBoardMeeting } from "../entities/rubber-board-meeting.entity";
import { RubberBoardMeetingRepository } from "./rubber-board-meeting.repository";

@Injectable()
export class MongoRubberBoardMeetingRepository
  extends MongoCrudRepository<RubberBoardMeeting>
  implements RubberBoardMeetingRepository
{
  constructor(@InjectModel("RubberBoardMeeting") model: Model<RubberBoardMeeting>) {
    super(model);
  }

  async findAllOrderedByDate(): Promise<RubberBoardMeeting[]> {
    const docs = await this.documents.find().sort({ meetingDate: -1, _id: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByProviderExternalId(
    provider: string,
    externalId: string,
  ): Promise<RubberBoardMeeting | null> {
    const doc = await this.documents.findOne({ provider, externalId }).lean().exec();
    return this.toDomain(doc);
  }

  async findRecentWithMinutes(limit: number): Promise<RubberBoardMeeting[]> {
    const docs = await this.documents
      .find({ minutesStatus: "GENERATED" })
      .sort({ meetingDate: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  build(data: Partial<RubberBoardMeeting>): RubberBoardMeeting {
    return data as RubberBoardMeeting;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
