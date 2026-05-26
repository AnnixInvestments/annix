import { CrudRepository } from "../lib/persistence/crud-repository";
import { MeetingRecording } from "./entities/meeting-recording.entity";

export abstract class MeetingRecordingRepository extends CrudRepository<MeetingRecording> {
  abstract findByMeetingId(meetingId: number): Promise<MeetingRecording | null>;
  abstract findByMeetingIdWithMeeting(meetingId: number): Promise<MeetingRecording | null>;
  abstract findWithMeeting(id: number): Promise<MeetingRecording | null>;
  abstract findAllSelectMeetingId(): Promise<MeetingRecording[]>;
  abstract findCompletedSelectIdMeetingId(): Promise<MeetingRecording[]>;
}
