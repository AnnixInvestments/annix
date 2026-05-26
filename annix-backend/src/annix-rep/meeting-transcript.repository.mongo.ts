import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MeetingTranscript } from "./entities/meeting-transcript.entity";
import { MeetingTranscriptRepository } from "./meeting-transcript.repository";

@Injectable()
export class MongoMeetingTranscriptRepository
  extends MongoCrudRepository<MeetingTranscript>
  implements MeetingTranscriptRepository
{
  constructor(@InjectModel("MeetingTranscript") model: Model<MeetingTranscript>) {
    super(model);
  }

  async findByRecordingId(recordingId: number): Promise<MeetingTranscript | null> {
    const doc = await this.documents.findOne({ recordingId }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllSelectRecordingId(): Promise<MeetingTranscript[]> {
    const docs = await this.documents.find({}, { recordingId: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findWithRecordingMeeting(id: number): Promise<MeetingTranscript | null> {
    const doc = await this.documents
      .findById(id)
      .populate({ path: "recording", populate: { path: "meeting" } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
