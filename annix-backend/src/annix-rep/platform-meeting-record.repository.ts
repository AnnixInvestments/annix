import { CrudRepository } from "../lib/persistence/crud-repository";
import { PlatformMeetingRecord } from "./entities/platform-meeting-record.entity";

export abstract class PlatformMeetingRecordRepository extends CrudRepository<PlatformMeetingRecord> {
  abstract findByConnectionAndPlatformMeeting(
    connectionId: number,
    platformMeetingId: string,
  ): Promise<PlatformMeetingRecord | null>;
  abstract findByConnection(connectionId: number, limit: number): Promise<PlatformMeetingRecord[]>;
  abstract findWithConnection(id: number): Promise<PlatformMeetingRecord | null>;
  abstract findPendingWithConnection(): Promise<PlatformMeetingRecord[]>;
  abstract findPendingWithConnectionLimited(limit: number): Promise<PlatformMeetingRecord[]>;
  abstract findDownloadedForTranscription(limit: number): Promise<PlatformMeetingRecord[]>;
  abstract deleteByConnection(connectionId: number): Promise<void>;
}
