import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
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
import { MeetingService } from "./meeting.service";

describe("MeetingService", () => {
  let service: MeetingService;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockRecordingRepo: Partial<Repository<MeetingRecording>>;
  let mockTranscriptRepo: Partial<Repository<MeetingTranscript>>;
  let mockProspectRepo: Partial<Repository<Prospect>>;
  let mockCalendarEventRepo: Partial<Repository<CalendarEvent>>;
  let mockCalendarConnectionRepo: Partial<Repository<CalendarConnection>>;

  const salesRepId = 100;
  const meetingId = 1;
  const scheduledStart = fromISO("2026-01-15T10:00:00Z").toJSDate();
  const scheduledEnd = fromISO("2026-01-15T11:00:00Z").toJSDate();

  const baseMeeting: Meeting = {
    id: meetingId,
    salesRepId,
    prospectId: null,
    prospect: null,
    calendarEventId: null,
    calendarEvent: null,
    title: "Discovery Call",
    description: null,
    meetingType: MeetingType.IN_PERSON,
    status: MeetingStatus.SCHEDULED,
    scheduledStart,
    scheduledEnd,
    actualStart: null,
    actualEnd: null,
    location: null,
    latitude: null,
    longitude: null,
    attendees: null,
    agenda: null,
    notes: null,
    outcomes: null,
    actionItems: null,
    summarySent: false,
    summarySentAt: null,
    crmExternalId: null,
    crmSyncStatus: null,
    crmLastSyncedAt: null,
    isRecurring: false,
    recurrenceRule: null,
    recurringParent: null,
    recurringParentId: null,
    recurrenceExceptionDates: null,
    organization: null,
    organizationId: null,
    notesVisibleToTeam: false,
    salesRep: undefined as any,
    createdAt: fromISO("2026-01-14T08:00:00Z").toJSDate(),
    updatedAt: fromISO("2026-01-14T08:00:00Z").toJSDate(),
  };

  beforeEach(async () => {
    mockMeetingRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...baseMeeting, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockRecordingRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    mockTranscriptRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    mockProspectRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockCalendarEventRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockCalendarConnectionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        { provide: getRepositoryToken(Meeting), useValue: mockMeetingRepo },
        { provide: getRepositoryToken(MeetingRecording), useValue: mockRecordingRepo },
        { provide: getRepositoryToken(MeetingTranscript), useValue: mockTranscriptRepo },
        { provide: getRepositoryToken(Prospect), useValue: mockProspectRepo },
        { provide: getRepositoryToken(CalendarEvent), useValue: mockCalendarEventRepo },
        { provide: getRepositoryToken(CalendarConnection), useValue: mockCalendarConnectionRepo },
      ],
    }).compile();

    service = module.get<MeetingService>(MeetingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const createDto = {
      title: "Discovery Call",
      scheduledStart: "2026-01-15T10:00:00Z",
      scheduledEnd: "2026-01-15T11:00:00Z",
      meetingType: MeetingType.IN_PERSON,
    };

    it("should create a meeting without prospect", async () => {
      (mockMeetingRepo.create as jest.Mock).mockReturnValue(baseMeeting);
      (mockMeetingRepo.save as jest.Mock).mockResolvedValue({ ...baseMeeting, id: 1 });

      const result = await service.create(salesRepId, createDto);

      expect(result.id).toBe(1);
      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          salesRepId,
          title: "Discovery Call",
          prospectId: null,
        }),
      );
      expect(mockMeetingRepo.save).toHaveBeenCalled();
    });

    it("should create a meeting with valid prospect", async () => {
      const dtoWithProspect = { ...createDto, prospectId: 10 };
      (mockProspectRepo.findOne as jest.Mock).mockResolvedValue({ id: 10 });
      (mockMeetingRepo.create as jest.Mock).mockReturnValue({ ...baseMeeting, prospectId: 10 });
      (mockMeetingRepo.save as jest.Mock).mockResolvedValue({ ...baseMeeting, prospectId: 10 });

      const result = await service.create(salesRepId, dtoWithProspect);

      expect(result.prospectId).toBe(10);
      expect(mockProspectRepo.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
    });

    it("should throw NotFoundException when prospect does not exist", async () => {
      const dtoWithProspect = { ...createDto, prospectId: 999 };
      (mockProspectRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.create(salesRepId, dtoWithProspect)).rejects.toThrow(NotFoundException);
    });

    it("should pass optional fields as null when not provided", async () => {
      (mockMeetingRepo.create as jest.Mock).mockReturnValue(baseMeeting);
      (mockMeetingRepo.save as jest.Mock).mockResolvedValue(baseMeeting);

      await service.create(salesRepId, createDto);

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          location: null,
          latitude: null,
          longitude: null,
          attendees: null,
          agenda: null,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return meetings for the sales rep ordered by scheduledStart DESC", async () => {
      const meetings = [baseMeeting, { ...baseMeeting, id: 2 }];
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue(meetings);

      const result = await service.findAll(salesRepId);

      expect(result).toHaveLength(2);
      expect(mockMeetingRepo.find).toHaveBeenCalledWith({
        where: { salesRepId },
        relations: ["prospect"],
        order: { scheduledStart: "DESC" },
        take: 500,
      });
    });

    it("should return empty array when no meetings exist", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(salesRepId);

      expect(result).toEqual([]);
    });
  });

  describe("findUpcoming", () => {
    it("should find upcoming scheduled meetings within default 7 days", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.findUpcoming(salesRepId);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            salesRepId,
            status: MeetingStatus.SCHEDULED,
          }),
          relations: ["prospect"],
          order: { scheduledStart: "ASC" },
        }),
      );
    });

    it("should accept custom days parameter", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);

      await service.findUpcoming(salesRepId, 14);

      expect(mockMeetingRepo.find).toHaveBeenCalled();
    });
  });

  describe("findByDateRange", () => {
    it("should find meetings between start and end dates", async () => {
      const start = fromISO("2026-01-01T00:00:00Z").toJSDate();
      const end = fromISO("2026-01-31T23:59:59Z").toJSDate();
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.findByDateRange(salesRepId, start, end);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ salesRepId }),
          relations: ["prospect"],
          order: { scheduledStart: "ASC" },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a meeting when found", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(baseMeeting);

      const result = await service.findOne(salesRepId, meetingId);

      expect(result.id).toBe(meetingId);
      expect(mockMeetingRepo.findOne).toHaveBeenCalledWith({
        where: { id: meetingId, salesRepId },
        relations: ["prospect"],
      });
    });

    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(salesRepId, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOneWithDetails", () => {
    it("should return meeting with recording and transcript", async () => {
      const mockRecording = { id: 1, meetingId };
      const mockTranscript = { id: 1, recordingId: 1 };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(baseMeeting);
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      const result = await service.findOneWithDetails(salesRepId, meetingId);

      expect(result.meeting.id).toBe(meetingId);
      expect(result.recording).toEqual(mockRecording);
      expect(result.transcript).toEqual(mockTranscript);
    });

    it("should return null recording and transcript when no recording exists", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(baseMeeting);
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneWithDetails(salesRepId, meetingId);

      expect(result.meeting.id).toBe(meetingId);
      expect(result.recording).toBeNull();
      expect(result.transcript).toBeNull();
    });

    it("should return null transcript when recording exists but no transcript", async () => {
      const mockRecording = { id: 1, meetingId };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(baseMeeting);
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneWithDetails(salesRepId, meetingId);

      expect(result.recording).toEqual(mockRecording);
      expect(result.transcript).toBeNull();
    });
  });

  describe("update", () => {
    it("should update meeting fields", async () => {
      const existingMeeting = { ...baseMeeting };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(existingMeeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.update(salesRepId, meetingId, {
        title: "Updated Title",
        notes: "Some notes",
      });

      expect(result.title).toBe("Updated Title");
      expect(result.notes).toBe("Some notes");
    });

    it("should validate prospect when prospectId is provided", async () => {
      const existingMeeting = { ...baseMeeting };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(existingMeeting);
      (mockProspectRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(salesRepId, meetingId, { prospectId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(salesRepId, 999, { title: "Updated" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update scheduledStart and scheduledEnd as Date objects", async () => {
      const existingMeeting = { ...baseMeeting };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(existingMeeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.update(salesRepId, meetingId, {
        scheduledStart: "2026-02-01T10:00:00Z",
        scheduledEnd: "2026-02-01T11:00:00Z",
      });

      expect(result.scheduledStart).toEqual(fromISO("2026-02-01T10:00:00Z").toJSDate());
      expect(result.scheduledEnd).toEqual(fromISO("2026-02-01T11:00:00Z").toJSDate());
    });
  });

  describe("start", () => {
    it("should start a scheduled meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.start(salesRepId, meetingId, {
        actualStart: "2026-01-15T10:05:00Z",
      });

      expect(result.status).toBe(MeetingStatus.IN_PROGRESS);
      expect(result.actualStart).toEqual(fromISO("2026-01-15T10:05:00Z").toJSDate());
    });

    it("should throw BadRequestException if meeting is already in progress", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(service.start(salesRepId, meetingId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if meeting is completed", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(service.start(salesRepId, meetingId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should default actualStart to now when not provided", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.start(salesRepId, meetingId, {});

      expect(result.actualStart).toBeDefined();
      expect(result.status).toBe(MeetingStatus.IN_PROGRESS);
    });
  });

  describe("end", () => {
    it("should end an in-progress meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.end(salesRepId, meetingId, {
        actualEnd: "2026-01-15T11:30:00Z",
        notes: "Great meeting",
        outcomes: "Deal progressed",
      });

      expect(result.status).toBe(MeetingStatus.COMPLETED);
      expect(result.actualEnd).toEqual(fromISO("2026-01-15T11:30:00Z").toJSDate());
      expect(result.notes).toBe("Great meeting");
      expect(result.outcomes).toBe("Deal progressed");
    });

    it("should throw BadRequestException if meeting is not in progress", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(service.end(salesRepId, meetingId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should default actualEnd to now when not provided", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.end(salesRepId, meetingId, {});

      expect(result.actualEnd).toBeDefined();
      expect(result.status).toBe(MeetingStatus.COMPLETED);
    });
  });

  describe("cancel", () => {
    it("should cancel a scheduled meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.cancel(salesRepId, meetingId);

      expect(result.status).toBe(MeetingStatus.CANCELLED);
    });

    it("should throw BadRequestException when cancelling a completed meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(service.cancel(salesRepId, meetingId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("markNoShow", () => {
    it("should mark meeting as no-show", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.markNoShow(salesRepId, meetingId);

      expect(result.status).toBe(MeetingStatus.NO_SHOW);
    });
  });

  describe("reschedule", () => {
    const rescheduleDto = {
      scheduledStart: "2026-02-01T10:00:00Z",
      scheduledEnd: "2026-02-01T11:00:00Z",
    };

    it("should reschedule a scheduled meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.reschedule(salesRepId, meetingId, rescheduleDto);

      expect(result.scheduledStart).toEqual(fromISO("2026-02-01T10:00:00Z").toJSDate());
      expect(result.scheduledEnd).toEqual(fromISO("2026-02-01T11:00:00Z").toJSDate());
    });

    it("should reactivate a cancelled meeting when rescheduled", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.CANCELLED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.reschedule(salesRepId, meetingId, rescheduleDto);

      expect(result.status).toBe(MeetingStatus.SCHEDULED);
    });

    it("should throw BadRequestException for completed meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(
        service.reschedule(salesRepId, meetingId, rescheduleDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for in-progress meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(
        service.reschedule(salesRepId, meetingId, rescheduleDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when end time is before start time", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(
        service.reschedule(salesRepId, meetingId, {
          scheduledStart: "2026-02-01T12:00:00Z",
          scheduledEnd: "2026-02-01T10:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when end time equals start time", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(meeting);

      await expect(
        service.reschedule(salesRepId, meetingId, {
          scheduledStart: "2026-02-01T10:00:00Z",
          scheduledEnd: "2026-02-01T10:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should remove a meeting", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(baseMeeting);

      await service.remove(salesRepId, meetingId);

      expect(mockMeetingRepo.remove).toHaveBeenCalledWith(baseMeeting);
    });

    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(salesRepId, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("todaysMeetings", () => {
    it("should return meetings for today", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.todaysMeetings(salesRepId);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ salesRepId }),
          relations: ["prospect"],
          order: { scheduledStart: "ASC" },
        }),
      );
    });
  });

  describe("activeMeeting", () => {
    it("should return the active meeting", async () => {
      const activeMeeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(activeMeeting);

      const result = await service.activeMeeting(salesRepId);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(MeetingStatus.IN_PROGRESS);
      expect(mockMeetingRepo.findOne).toHaveBeenCalledWith({
        where: { salesRepId, status: MeetingStatus.IN_PROGRESS },
        relations: ["prospect"],
      });
    });

    it("should return null when no active meeting", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.activeMeeting(salesRepId);

      expect(result).toBeNull();
    });
  });

  describe("meetingsWithRecordings", () => {
    it("should return empty array when no recordings exist", async () => {
      (mockRecordingRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsWithRecordings(salesRepId);

      expect(result).toEqual([]);
    });

    it("should query meetings that have recordings", async () => {
      const recordings = [{ meetingId: 1 }, { meetingId: 2 }];
      (mockRecordingRepo.find as jest.Mock).mockResolvedValue(recordings);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseMeeting]),
      };
      (mockMeetingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.meetingsWithRecordings(salesRepId);

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        "meeting.id IN (:...meetingIds)",
        { meetingIds: [1, 2] },
      );
    });
  });

  describe("meetingsPendingTranscription", () => {
    it("should return empty array when no completed recordings exist", async () => {
      (mockRecordingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockTranscriptRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsPendingTranscription(salesRepId);

      expect(result).toEqual([]);
    });

    it("should return meetings with completed recordings but no transcripts", async () => {
      const completedRecordings = [
        { id: 10, meetingId: 1, processingStatus: RecordingProcessingStatus.COMPLETED },
        { id: 20, meetingId: 2, processingStatus: RecordingProcessingStatus.COMPLETED },
      ];
      const transcripts = [{ recordingId: 10 }];

      (mockRecordingRepo.find as jest.Mock).mockResolvedValue(completedRecordings);
      (mockTranscriptRepo.find as jest.Mock).mockResolvedValue(transcripts);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...baseMeeting, id: 2 }]),
      };
      (mockMeetingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.meetingsPendingTranscription(salesRepId);

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        "meeting.id IN (:...pendingMeetingIds)",
        { pendingMeetingIds: [2] },
      );
    });
  });

  describe("createFromCalendarEvent", () => {
    const calendarEventId = 50;
    const mockCalendarEvent = {
      id: calendarEventId,
      connectionId: 5,
      title: "Calendar Meeting",
      description: "From calendar",
      startTime: fromISO("2026-01-20T14:00:00Z").toJSDate(),
      endTime: fromISO("2026-01-20T15:00:00Z").toJSDate(),
      location: "Office",
      attendees: ["alice@example.com"],
      meetingUrl: null,
      provider: "google",
      connection: { id: 5 },
    };

    const mockConnection = {
      id: 5,
      userId: salesRepId,
    };

    it("should create a meeting from a calendar event", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) => ({
        ...baseMeeting,
        ...data,
        id: 5,
      }));
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.createFromCalendarEvent(salesRepId, calendarEventId, {});

      expect(result.meeting.title).toBe("Calendar Meeting");
      expect(result.calendarProvider).toBe("google");
      expect(result.meetingUrl).toBeNull();
    });

    it("should throw NotFoundException when calendar event does not exist", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createFromCalendarEvent(salesRepId, 999, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when connection does not belong to user", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue({
        id: 5,
        userId: 999,
      });

      await expect(
        service.createFromCalendarEvent(salesRepId, calendarEventId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when meeting already exists for calendar event", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue({ id: 99, calendarEventId });

      await expect(
        service.createFromCalendarEvent(salesRepId, calendarEventId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("should use override title when provided", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) => ({
        ...baseMeeting,
        ...data,
      }));
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.createFromCalendarEvent(salesRepId, calendarEventId, {
        overrideTitle: "Custom Title",
      });

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Custom Title" }),
      );
    });

    it("should infer VIDEO meeting type when event has meetingUrl", async () => {
      const eventWithUrl = { ...mockCalendarEvent, meetingUrl: "https://meet.google.com/abc" };
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(eventWithUrl);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) => ({
        ...baseMeeting,
        ...data,
      }));
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      await service.createFromCalendarEvent(salesRepId, calendarEventId, {});

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ meetingType: MeetingType.VIDEO }),
      );
    });

    it("should infer PHONE meeting type when location contains phone", async () => {
      const eventWithPhone = { ...mockCalendarEvent, location: "Phone call" };
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(eventWithPhone);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) => ({
        ...baseMeeting,
        ...data,
      }));
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      await service.createFromCalendarEvent(salesRepId, calendarEventId, {});

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ meetingType: MeetingType.PHONE }),
      );
    });

    it("should merge calendar attendees with additional attendees", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) => ({
        ...baseMeeting,
        ...data,
      }));
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      await service.createFromCalendarEvent(salesRepId, calendarEventId, {
        additionalAttendees: ["bob@example.com"],
      });

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          attendees: ["alice@example.com", "bob@example.com"],
        }),
      );
    });

    it("should validate prospect when prospectId provided", async () => {
      (mockCalendarEventRepo.findOne as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockProspectRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createFromCalendarEvent(salesRepId, calendarEventId, { prospectId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
