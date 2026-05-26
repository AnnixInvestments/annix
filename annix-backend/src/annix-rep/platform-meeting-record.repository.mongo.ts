import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "./entities/platform-meeting-record.entity";
import { PlatformMeetingRecordRepository } from "./platform-meeting-record.repository";

@Injectable()
export class MongoPlatformMeetingRecordRepository
  extends MongoCrudRepository<PlatformMeetingRecord>
  implements PlatformMeetingRecordRepository
{
  constructor(@InjectModel("PlatformMeetingRecord") model: Model<PlatformMeetingRecord>) {
    super(model);
  }

  async findByConnectionAndPlatformMeeting(
    connectionId: number,
    platformMeetingId: string,
  ): Promise<PlatformMeetingRecord | null> {
    const doc = await this.documents.findOne({ connectionId, platformMeetingId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByConnection(connectionId: number, limit: number): Promise<PlatformMeetingRecord[]> {
    const docs = await this.documents
      .find({ connectionId })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findWithConnection(id: number): Promise<PlatformMeetingRecord | null> {
    const doc = await this.documents.findById(id).populate("connection").lean().exec();
    return this.toDomain(doc);
  }

  async findPendingWithConnection(): Promise<PlatformMeetingRecord[]> {
    const docs = await this.documents
      .find({ recordingStatus: PlatformRecordingStatus.PENDING })
      .populate("connection")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPendingWithConnectionLimited(limit: number): Promise<PlatformMeetingRecord[]> {
    const docs = await this.documents
      .find({ recordingStatus: PlatformRecordingStatus.PENDING })
      .populate("connection")
      .sort({ startTime: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findDownloadedForTranscription(limit: number): Promise<PlatformMeetingRecord[]> {
    const docs = await this.documents
      .find({ recordingStatus: PlatformRecordingStatus.DOWNLOADED })
      .populate("connection")
      .sort({ downloadedAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteByConnection(connectionId: number): Promise<void> {
    await this.documents.deleteMany({ connectionId }).exec();
  }
}
