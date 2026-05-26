import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MeetingTranscript } from "./entities/meeting-transcript.entity";
import { MeetingTranscriptRepository } from "./meeting-transcript.repository";

@Injectable()
export class PostgresMeetingTranscriptRepository
  extends TypeOrmCrudRepository<MeetingTranscript>
  implements MeetingTranscriptRepository
{
  constructor(@InjectRepository(MeetingTranscript) repository: Repository<MeetingTranscript>) {
    super(repository);
  }

  findByRecordingId(recordingId: number): Promise<MeetingTranscript | null> {
    return this.repository.findOne({ where: { recordingId } });
  }

  findAllSelectRecordingId(): Promise<MeetingTranscript[]> {
    return this.repository.find({ select: ["recordingId"] });
  }

  findWithRecordingMeeting(id: number): Promise<MeetingTranscript | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["recording", "recording.meeting"],
    });
  }
}
