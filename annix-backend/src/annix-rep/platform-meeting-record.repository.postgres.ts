import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "./entities/platform-meeting-record.entity";
import { PlatformMeetingRecordRepository } from "./platform-meeting-record.repository";

@Injectable()
export class PostgresPlatformMeetingRecordRepository
  extends TypeOrmCrudRepository<PlatformMeetingRecord>
  implements PlatformMeetingRecordRepository
{
  constructor(
    @InjectRepository(PlatformMeetingRecord) repository: Repository<PlatformMeetingRecord>,
  ) {
    super(repository);
  }

  findByConnectionAndPlatformMeeting(
    connectionId: number,
    platformMeetingId: string,
  ): Promise<PlatformMeetingRecord | null> {
    return this.repository.findOne({
      where: { connectionId, platformMeetingId },
    });
  }

  findByConnection(connectionId: number, limit: number): Promise<PlatformMeetingRecord[]> {
    return this.repository.find({
      where: { connectionId },
      order: { startTime: "DESC" },
      take: limit,
    });
  }

  findWithConnection(id: number): Promise<PlatformMeetingRecord | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["connection"],
    });
  }

  findPendingWithConnection(): Promise<PlatformMeetingRecord[]> {
    return this.repository.find({
      where: { recordingStatus: PlatformRecordingStatus.PENDING },
      relations: ["connection"],
    });
  }

  findPendingWithConnectionLimited(limit: number): Promise<PlatformMeetingRecord[]> {
    return this.repository.find({
      where: { recordingStatus: PlatformRecordingStatus.PENDING },
      relations: ["connection"],
      take: limit,
      order: { startTime: "DESC" },
    });
  }

  findDownloadedForTranscription(limit: number): Promise<PlatformMeetingRecord[]> {
    return this.repository.find({
      where: { recordingStatus: PlatformRecordingStatus.DOWNLOADED },
      relations: ["connection"],
      order: { downloadedAt: "ASC" },
      take: limit,
    });
  }

  async deleteByConnection(connectionId: number): Promise<void> {
    await this.repository.delete({ connectionId });
  }
}
