import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MeetingRecording, RecordingProcessingStatus } from "./entities/meeting-recording.entity";
import { MeetingRecordingRepository } from "./meeting-recording.repository";

@Injectable()
export class PostgresMeetingRecordingRepository
  extends TypeOrmCrudRepository<MeetingRecording>
  implements MeetingRecordingRepository
{
  constructor(@InjectRepository(MeetingRecording) repository: Repository<MeetingRecording>) {
    super(repository);
  }

  findByMeetingId(meetingId: number): Promise<MeetingRecording | null> {
    return this.repository.findOne({ where: { meetingId } });
  }

  findByMeetingIdWithMeeting(meetingId: number): Promise<MeetingRecording | null> {
    return this.repository.findOne({ where: { meetingId }, relations: ["meeting"] });
  }

  findWithMeeting(id: number): Promise<MeetingRecording | null> {
    return this.repository.findOne({ where: { id }, relations: ["meeting"] });
  }

  findAllSelectMeetingId(): Promise<MeetingRecording[]> {
    return this.repository.find({ select: ["meetingId"] });
  }

  findCompletedSelectIdMeetingId(): Promise<MeetingRecording[]> {
    return this.repository.find({
      where: { processingStatus: RecordingProcessingStatus.COMPLETED },
      select: ["id", "meetingId"],
    });
  }
}
