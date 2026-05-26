import { CrudRepository } from "../lib/persistence/crud-repository";
import { MeetingTranscript } from "./entities/meeting-transcript.entity";

export abstract class MeetingTranscriptRepository extends CrudRepository<MeetingTranscript> {
  abstract findByRecordingId(recordingId: number): Promise<MeetingTranscript | null>;
  abstract findAllSelectRecordingId(): Promise<MeetingTranscript[]>;
  abstract findWithRecordingMeeting(id: number): Promise<MeetingTranscript | null>;
}
