import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  CreateMeetingDto,
  CreateMeetingFromCalendarDto,
  EndMeetingDto,
  RescheduleMeetingDto,
  StartMeetingDto,
  UpdateMeetingDto,
} from "../dto";
import {
  CalendarConnection,
  CalendarEvent,
  Meeting,
  MeetingRecording,
  MeetingStatus,
  MeetingTranscript,
  MeetingType,
  Prospect,
  RecordingProcessingStatus,
} from "../entities";

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingRecording)
    private readonly recordingRepo: Repository<MeetingRecording>,
    @InjectRepository(MeetingTranscript)
    private readonly transcriptRepo: Repository<MeetingTranscript>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepo: Repository<CalendarEvent>,
    @InjectRepository(CalendarConnection)
    private readonly calendarConnectionRepo: Repository<CalendarConnection>,
  ) {}

  async create(salesRepId: number, dto: CreateMeetingDto): Promise<Meeting> {
    if (dto.prospectId) {
      const prospect = await this.prospectRepo.findOne({
        where: { id: dto.prospectId },
      });
      if (!prospect) {
        throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
      }
    }

    const meeting = this.meetingRepo.create({
      salesRepId,
      prospectId: dto.prospectId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      meetingType: dto.meetingType,
      scheduledStart: new Date(dto.scheduledStart),
      scheduledEnd: new Date(dto.scheduledEnd),
      location: dto.location ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      attendees: dto.attendees ?? null,
      agenda: dto.agenda ?? null,
    });

    const saved = await this.meetingRepo.save(meeting);
    this.logger.log(`Meeting created: ${saved.id} by user ${salesRepId}`);
    return saved;
  }

  async findAll(salesRepId: number): Promise<Meeting[]> {
    return this.meetingRepo.find({
      where: { salesRepId },
      relations: ["prospect"],
      order: { scheduledStart: "DESC" },
    });
  }

  async findUpcoming(salesRepId: number, days: number = 7): Promise<Meeting[]> {
    const startDate = now().toJSDate();
    const endDate = now().plus({ days }).toJSDate();

    return this.meetingRepo.find({
      where: {
        salesRepId,
        scheduledStart: Between(startDate, endDate),
        status: MeetingStatus.SCHEDULED,
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  async findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]> {
    return this.meetingRepo.find({
      where: {
        salesRepId,
        scheduledStart: Between(startDate, endDate),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  async findOne(salesRepId: number, id: number): Promise<Meeting> {
    const meeting = await this.meetingRepo.findOne({
      where: { id, salesRepId },
      relations: ["prospect"],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${id} not found`);
    }

    return meeting;
  }

  async findOneWithDetails(
    salesRepId: number,
    id: number,
  ): Promise<{
    meeting: Meeting;
    recording: MeetingRecording | null;
    transcript: MeetingTranscript | null;
  }> {
    const meeting = await this.findOne(salesRepId, id);

    const recording = await this.recordingRepo.findOne({
      where: { meetingId: id },
    });

    let transcript: MeetingTranscript | null = null;
    if (recording) {
      transcript = await this.transcriptRepo.findOne({
        where: { recordingId: recording.id },
      });
    }

    return { meeting, recording, transcript };
  }

  async update(salesRepId: number, id: number, dto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);

    if (dto.prospectId !== undefined) {
      if (dto.prospectId) {
        const prospect = await this.prospectRepo.findOne({
          where: { id: dto.prospectId },
        });
        if (!prospect) {
          throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
        }
      }
      meeting.prospectId = dto.prospectId ?? null;
    }

    if (dto.title !== undefined) meeting.title = dto.title;
    if (dto.description !== undefined) meeting.description = dto.description ?? null;
    if (dto.meetingType !== undefined) meeting.meetingType = dto.meetingType;
    if (dto.status !== undefined) meeting.status = dto.status;
    if (dto.scheduledStart !== undefined) meeting.scheduledStart = new Date(dto.scheduledStart);
    if (dto.scheduledEnd !== undefined) meeting.scheduledEnd = new Date(dto.scheduledEnd);
    if (dto.location !== undefined) meeting.location = dto.location ?? null;
    if (dto.latitude !== undefined) meeting.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) meeting.longitude = dto.longitude ?? null;
    if (dto.attendees !== undefined) meeting.attendees = dto.attendees ?? null;
    if (dto.agenda !== undefined) meeting.agenda = dto.agenda ?? null;
    if (dto.notes !== undefined) meeting.notes = dto.notes ?? null;
    if (dto.outcomes !== undefined) meeting.outcomes = dto.outcomes ?? null;
    if (dto.actionItems !== undefined) meeting.actionItems = dto.actionItems ?? null;

    return this.meetingRepo.save(meeting);
  }

  async start(salesRepId: number, id: number, dto: StartMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);

    if (meeting.status === MeetingStatus.IN_PROGRESS) {
      throw new BadRequestException("Meeting is already in progress");
    }

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException("Meeting has already been completed");
    }

    meeting.status = MeetingStatus.IN_PROGRESS;
    meeting.actualStart = dto.actualStart ? new Date(dto.actualStart) : now().toJSDate();

    const saved = await this.meetingRepo.save(meeting);
    this.logger.log(`Meeting ${id} started`);
    return saved;
  }

  async end(salesRepId: number, id: number, dto: EndMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);

    if (meeting.status !== MeetingStatus.IN_PROGRESS) {
      throw new BadRequestException("Meeting is not in progress");
    }

    meeting.status = MeetingStatus.COMPLETED;
    meeting.actualEnd = dto.actualEnd ? new Date(dto.actualEnd) : now().toJSDate();
    if (dto.notes) meeting.notes = dto.notes;
    if (dto.outcomes) meeting.outcomes = dto.outcomes;
    if (dto.actionItems) meeting.actionItems = dto.actionItems;

    const saved = await this.meetingRepo.save(meeting);
    this.logger.log(`Meeting ${id} ended`);
    return saved;
  }

  async cancel(salesRepId: number, id: number): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException("Cannot cancel a completed meeting");
    }

    meeting.status = MeetingStatus.CANCELLED;
    return this.meetingRepo.save(meeting);
  }

  async markNoShow(salesRepId: number, id: number): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);
    meeting.status = MeetingStatus.NO_SHOW;
    return this.meetingRepo.save(meeting);
  }

  async reschedule(salesRepId: number, id: number, dto: RescheduleMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException("Cannot reschedule a completed meeting");
    }

    if (meeting.status === MeetingStatus.IN_PROGRESS) {
      throw new BadRequestException("Cannot reschedule a meeting that is in progress");
    }

    const newStart = new Date(dto.scheduledStart);
    const newEnd = new Date(dto.scheduledEnd);

    if (newEnd <= newStart) {
      throw new BadRequestException("End time must be after start time");
    }

    const originalStart = meeting.scheduledStart;
    const originalEnd = meeting.scheduledEnd;

    meeting.scheduledStart = newStart;
    meeting.scheduledEnd = newEnd;

    if (meeting.status === MeetingStatus.CANCELLED) {
      meeting.status = MeetingStatus.SCHEDULED;
    }

    const saved = await this.meetingRepo.save(meeting);

    this.logger.log(
      `Meeting ${id} rescheduled from ${originalStart.toISOString()} to ${newStart.toISOString()}`,
    );

    return saved;
  }

  async remove(salesRepId: number, id: number): Promise<void> {
    const meeting = await this.findOne(salesRepId, id);
    await this.meetingRepo.remove(meeting);
    this.logger.log(`Meeting deleted: ${id}`);
  }

  async todaysMeetings(salesRepId: number): Promise<Meeting[]> {
    const today = now().startOf("day").toJSDate();
    const tomorrow = now().plus({ days: 1 }).startOf("day").toJSDate();

    return this.meetingRepo.find({
      where: {
        salesRepId,
        scheduledStart: Between(today, tomorrow),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  async activeMeeting(salesRepId: number): Promise<Meeting | null> {
    return this.meetingRepo.findOne({
      where: {
        salesRepId,
        status: MeetingStatus.IN_PROGRESS,
      },
      relations: ["prospect"],
    });
  }

  async meetingsWithRecordings(salesRepId: number): Promise<Meeting[]> {
    const recordings = await this.recordingRepo.find({
      select: ["meetingId"],
    });

    const meetingIds = recordings.map((r) => r.meetingId);

    if (meetingIds.length === 0) {
      return [];
    }

    return this.meetingRepo
      .createQueryBuilder("meeting")
      .where("meeting.sales_rep_id = :salesRepId", { salesRepId })
      .andWhere("meeting.id IN (:...meetingIds)", { meetingIds })
      .leftJoinAndSelect("meeting.prospect", "prospect")
      .orderBy("meeting.scheduled_start", "DESC")
      .getMany();
  }

  async meetingsPendingTranscription(salesRepId: number): Promise<Meeting[]> {
    const completedRecordings = await this.recordingRepo.find({
      where: { processingStatus: RecordingProcessingStatus.COMPLETED },
      select: ["id", "meetingId"],
    });

    const transcribedRecordingIds = (
      await this.transcriptRepo.find({
        select: ["recordingId"],
      })
    ).map((t) => t.recordingId);

    const pendingMeetingIds = completedRecordings
      .filter((r) => !transcribedRecordingIds.includes(r.id))
      .map((r) => r.meetingId);

    if (pendingMeetingIds.length === 0) {
      return [];
    }

    return this.meetingRepo
      .createQueryBuilder("meeting")
      .where("meeting.sales_rep_id = :salesRepId", { salesRepId })
      .andWhere("meeting.id IN (:...pendingMeetingIds)", { pendingMeetingIds })
      .leftJoinAndSelect("meeting.prospect", "prospect")
      .orderBy("meeting.scheduled_start", "DESC")
      .getMany();
  }

  async createFromCalendarEvent(
    salesRepId: number,
    calendarEventId: number,
    dto: CreateMeetingFromCalendarDto,
  ): Promise<{ meeting: Meeting; calendarProvider: string; meetingUrl: string | null }> {
    const calendarEvent = await this.calendarEventRepo.findOne({
      where: { id: calendarEventId },
      relations: ["connection"],
    });

    if (!calendarEvent) {
      throw new NotFoundException(`Calendar event ${calendarEventId} not found`);
    }

    const connection = await this.calendarConnectionRepo.findOne({
      where: { id: calendarEvent.connectionId },
    });

    if (!connection || connection.userId !== salesRepId) {
      throw new NotFoundException(`Calendar event ${calendarEventId} not found or not accessible`);
    }

    const existingMeeting = await this.meetingRepo.findOne({
      where: { calendarEventId },
    });

    if (existingMeeting) {
      throw new BadRequestException(
        `A meeting already exists for calendar event ${calendarEventId}`,
      );
    }

    if (dto.prospectId) {
      const prospect = await this.prospectRepo.findOne({
        where: { id: dto.prospectId },
      });
      if (!prospect) {
        throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
      }
    }

    const meetingType = dto.meetingType ?? this.inferMeetingType(calendarEvent);

    const allAttendees = [...(calendarEvent.attendees ?? []), ...(dto.additionalAttendees ?? [])];

    const meeting = this.meetingRepo.create({
      salesRepId,
      prospectId: dto.prospectId ?? null,
      calendarEventId,
      title: dto.overrideTitle ?? calendarEvent.title,
      description: calendarEvent.description,
      meetingType,
      scheduledStart: calendarEvent.startTime,
      scheduledEnd: calendarEvent.endTime,
      location: calendarEvent.location,
      attendees: allAttendees.length > 0 ? allAttendees : null,
    });

    const saved = await this.meetingRepo.save(meeting);
    this.logger.log(
      `Meeting ${saved.id} created from calendar event ${calendarEventId} by user ${salesRepId}`,
    );

    return {
      meeting: saved,
      calendarProvider: calendarEvent.provider,
      meetingUrl: calendarEvent.meetingUrl,
    };
  }

  private inferMeetingType(event: CalendarEvent): MeetingType {
    if (event.meetingUrl) {
      return MeetingType.VIDEO;
    }
    if (
      event.location?.toLowerCase().includes("phone") ||
      event.location?.toLowerCase().includes("call")
    ) {
      return MeetingType.PHONE;
    }
    return MeetingType.IN_PERSON;
  }
}
