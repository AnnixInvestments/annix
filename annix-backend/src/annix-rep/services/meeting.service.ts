import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { fromISO, now } from "../../lib/datetime";
import { CalendarConnectionRepository } from "../calendar-connection.repository";
import { CalendarEventRepository } from "../calendar-event.repository";
import {
  CreateMeetingDto,
  CreateMeetingFromCalendarDto,
  EndMeetingDto,
  RescheduleMeetingDto,
  StartMeetingDto,
  UpdateMeetingDto,
} from "../dto";
import {
  CalendarEvent,
  Meeting,
  MeetingRecording,
  MeetingStatus,
  MeetingTranscript,
  MeetingType,
} from "../entities";
import { MeetingRepository } from "../meeting.repository";
import { MeetingRecordingRepository } from "../meeting-recording.repository";
import { MeetingTranscriptRepository } from "../meeting-transcript.repository";
import { ProspectRepository } from "../prospect.repository";

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly transcriptRepo: MeetingTranscriptRepository,
    private readonly prospectRepo: ProspectRepository,
    private readonly calendarEventRepo: CalendarEventRepository,
    private readonly calendarConnectionRepo: CalendarConnectionRepository,
  ) {}

  async create(salesRepId: number, dto: CreateMeetingDto): Promise<Meeting> {
    if (dto.prospectId) {
      const prospect = await this.prospectRepo.findById(dto.prospectId);
      if (!prospect) {
        throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
      }
    }

    const saved = await this.meetingRepo.create({
      salesRepId,
      prospectId: dto.prospectId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      meetingType: dto.meetingType,
      scheduledStart: fromISO(dto.scheduledStart).toJSDate(),
      scheduledEnd: fromISO(dto.scheduledEnd).toJSDate(),
      location: dto.location ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      attendees: dto.attendees ?? null,
      agenda: dto.agenda ?? null,
    });
    this.logger.log(`Meeting created: ${saved.id} by user ${salesRepId}`);
    return saved;
  }

  async findAll(salesRepId: number, limit: number = 500): Promise<Meeting[]> {
    return this.meetingRepo.findAllForSalesRep(salesRepId, limit);
  }

  async findUpcoming(salesRepId: number, days: number = 7): Promise<Meeting[]> {
    const startDate = now().toJSDate();
    const endDate = now().plus({ days }).toJSDate();

    return this.meetingRepo.findUpcoming(salesRepId, startDate, endDate);
  }

  async findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]> {
    return this.meetingRepo.findByDateRange(salesRepId, startDate, endDate);
  }

  async findOne(salesRepId: number, id: number): Promise<Meeting> {
    const meeting = await this.meetingRepo.findOneForSalesRep(salesRepId, id);

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

    const recording = await this.recordingRepo.findByMeetingId(id);

    let transcript: MeetingTranscript | null = null;
    if (recording) {
      transcript = await this.transcriptRepo.findByRecordingId(recording.id);
    }

    return { meeting, recording, transcript };
  }

  async update(salesRepId: number, id: number, dto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(salesRepId, id);

    if (dto.prospectId != null) {
      if (dto.prospectId) {
        const prospect = await this.prospectRepo.findById(dto.prospectId);
        if (!prospect) {
          throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
        }
      }
      meeting.prospectId = dto.prospectId ?? null;
    }

    if (dto.title != null) meeting.title = dto.title;
    if (dto.description != null) meeting.description = dto.description ?? null;
    if (dto.meetingType != null) meeting.meetingType = dto.meetingType;
    if (dto.status != null) meeting.status = dto.status;
    if (dto.scheduledStart != null) meeting.scheduledStart = fromISO(dto.scheduledStart).toJSDate();
    if (dto.scheduledEnd != null) meeting.scheduledEnd = fromISO(dto.scheduledEnd).toJSDate();
    if (dto.location != null) meeting.location = dto.location ?? null;
    if (dto.latitude != null) meeting.latitude = dto.latitude ?? null;
    if (dto.longitude != null) meeting.longitude = dto.longitude ?? null;
    if (dto.attendees != null) meeting.attendees = dto.attendees ?? null;
    if (dto.agenda != null) meeting.agenda = dto.agenda ?? null;
    if (dto.notes != null) meeting.notes = dto.notes ?? null;
    if (dto.outcomes != null) meeting.outcomes = dto.outcomes ?? null;
    if (dto.actionItems != null) meeting.actionItems = dto.actionItems ?? null;

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
    meeting.actualStart = dto.actualStart ? fromISO(dto.actualStart).toJSDate() : now().toJSDate();

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
    meeting.actualEnd = dto.actualEnd ? fromISO(dto.actualEnd).toJSDate() : now().toJSDate();
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

    const newStart = fromISO(dto.scheduledStart).toJSDate();
    const newEnd = fromISO(dto.scheduledEnd).toJSDate();

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

    return this.meetingRepo.findTodays(salesRepId, today, tomorrow);
  }

  async activeMeeting(salesRepId: number): Promise<Meeting | null> {
    return this.meetingRepo.findActive(salesRepId);
  }

  async meetingsWithRecordings(salesRepId: number): Promise<Meeting[]> {
    const recordings = await this.recordingRepo.findAllSelectMeetingId();

    const meetingIds = recordings.map((r) => r.meetingId);

    if (meetingIds.length === 0) {
      return [];
    }

    return this.meetingRepo.findWithProspectInIds(salesRepId, meetingIds);
  }

  async meetingsPendingTranscription(salesRepId: number): Promise<Meeting[]> {
    const completedRecordings = await this.recordingRepo.findCompletedSelectIdMeetingId();

    const transcribedRecordingIds = (await this.transcriptRepo.findAllSelectRecordingId()).map(
      (t) => t.recordingId,
    );

    const pendingMeetingIds = completedRecordings
      .filter((r) => !transcribedRecordingIds.includes(r.id))
      .map((r) => r.meetingId);

    if (pendingMeetingIds.length === 0) {
      return [];
    }

    return this.meetingRepo.findWithProspectInIds(salesRepId, pendingMeetingIds);
  }

  async createFromCalendarEvent(
    salesRepId: number,
    calendarEventId: number,
    dto: CreateMeetingFromCalendarDto,
  ): Promise<{ meeting: Meeting; calendarProvider: string; meetingUrl: string | null }> {
    const calendarEvent = await this.calendarEventRepo.findWithConnection(calendarEventId);

    if (!calendarEvent) {
      throw new NotFoundException(`Calendar event ${calendarEventId} not found`);
    }

    const connection = await this.calendarConnectionRepo.findById(calendarEvent.connectionId);

    if (!connection || connection.userId !== salesRepId) {
      throw new NotFoundException(`Calendar event ${calendarEventId} not found or not accessible`);
    }

    const existingMeeting = await this.meetingRepo.findByCalendarEventId(calendarEventId);

    if (existingMeeting) {
      throw new BadRequestException(
        `A meeting already exists for calendar event ${calendarEventId}`,
      );
    }

    if (dto.prospectId) {
      const prospect = await this.prospectRepo.findById(dto.prospectId);
      if (!prospect) {
        throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
      }
    }

    const meetingType = dto.meetingType ?? this.inferMeetingType(calendarEvent);

    const allAttendees = [...(calendarEvent.attendees ?? []), ...(dto.additionalAttendees ?? [])];

    const saved = await this.meetingRepo.create({
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
