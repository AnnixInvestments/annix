import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MeetingRecording, RecordingProcessingStatus } from "./entities/meeting-recording.entity";
import { MeetingRecordingRepository } from "./meeting-recording.repository";

@Injectable()
export class MongoMeetingRecordingRepository
  extends MongoCrudRepository<MeetingRecording>
  implements MeetingRecordingRepository
{
  constructor(@InjectModel("MeetingRecording") model: Model<MeetingRecording>) {
    super(model);
  }

  async findByMeetingId(meetingId: number): Promise<MeetingRecording | null> {
    const doc = await this.documents.findOne({ meetingId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByMeetingIdWithMeeting(meetingId: number): Promise<MeetingRecording | null> {
    const doc = await this.documents.findOne({ meetingId }).populate("meeting").lean().exec();
    return this.toDomain(doc);
  }

  async findWithMeeting(id: number): Promise<MeetingRecording | null> {
    const doc = await this.documents.findById(id).populate("meeting").lean().exec();
    return this.toDomain(doc);
  }

  async findAllSelectMeetingId(): Promise<MeetingRecording[]> {
    const docs = await this.documents.find({}, { meetingId: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findCompletedSelectIdMeetingId(): Promise<MeetingRecording[]> {
    const docs = await this.documents
      .find({ processingStatus: RecordingProcessingStatus.COMPLETED }, { _id: 1, meetingId: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
