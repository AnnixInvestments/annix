import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { CalendarConnectionRepository } from "../calendar-connection.repository";
import { CalendarEventRepository } from "../calendar-event.repository";
import { Meeting, MeetingStatus, MeetingType, RecordingProcessingStatus } from "../entities";
import { MeetingRepository } from "../meeting.repository";
import { MeetingRecordingRepository } from "../meeting-recording.repository";
import { MeetingTranscriptRepository } from "../meeting-transcript.repository";
import { ProspectRepository } from "../prospect.repository";
import { MeetingService } from "./meeting.service";

describe("MeetingService", () => {
  let service: MeetingService;
  let mockMeetingRepo: Partial<MeetingRepository>;
  let mockRecordingRepo: Partial<MeetingRecordingRepository>;
  let mockTranscriptRepo: Partial<MeetingTranscriptRepository>;
  let mockProspectRepo: Partial<ProspectRepository>;
  let mockCalendarEventRepo: Partial<CalendarEventRepository>;
  let mockCalendarConnectionRepo: Partial<CalendarConnectionRepository>;

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
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...baseMeeting, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findAllForSalesRep: jest.fn().mockResolvedValue([]),
      findUpcoming: jest.fn().mockResolvedValue([]),
      findByDateRange: jest.fn().mockResolvedValue([]),
      findTodays: jest.fn().mockResolvedValue([]),
      findActive: jest.fn().mockResolvedValue(null),
      findOneForSalesRep: jest.fn().mockResolvedValue(null),
      findByCalendarEventId: jest.fn().mockResolvedValue(null),
      findWithProspectInIds: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockRecordingRepo = {
      findByMeetingId: jest.fn().mockResolvedValue(null),
      findAllSelectMeetingId: jest.fn().mockResolvedValue([]),
      findCompletedSelectIdMeetingId: jest.fn().mockResolvedValue([]),
    };

    mockTranscriptRepo = {
      findByRecordingId: jest.fn().mockResolvedValue(null),
      findAllSelectRecordingId: jest.fn().mockResolvedValue([]),
    };

    mockProspectRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    mockCalendarEventRepo = {
      findWithConnection: jest.fn().mockResolvedValue(null),
    };

    mockCalendarConnectionRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        { provide: MeetingRepository, useValue: mockMeetingRepo },
        { provide: MeetingRecordingRepository, useValue: mockRecordingRepo },
        { provide: MeetingTranscriptRepository, useValue: mockTranscriptRepo },
        { provide: ProspectRepository, useValue: mockProspectRepo },
        { provide: CalendarEventRepository, useValue: mockCalendarEventRepo },
        { provide: CalendarConnectionRepository, useValue: mockCalendarConnectionRepo },
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
      (mockMeetingRepo.create as jest.Mock).mockResolvedValue(baseMeeting);

      const result = await service.create(salesRepId, createDto);

      expect(result.id).toBe(1);
      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          salesRepId,
          title: "Discovery Call",
          prospectId: null,
        }),
      );
    });

    it("should create a meeting with valid prospect", async () => {
      const dtoWithProspect = { ...createDto, prospectId: 10 };
      (mockProspectRepo.findById as jest.Mock).mockResolvedValue({ id: 10 });
      (mockMeetingRepo.create as jest.Mock).mockResolvedValue({ ...baseMeeting, prospectId: 10 });

      const result = await service.create(salesRepId, dtoWithProspect);

      expect(result.prospectId).toBe(10);
      expect(mockProspectRepo.findById).toHaveBeenCalledWith(10);
    });

    it("should throw NotFoundException when prospect does not exist", async () => {
      const dtoWithProspect = { ...createDto, prospectId: 999 };
      (mockProspectRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.create(salesRepId, dtoWithProspect)).rejects.toThrow(NotFoundException);
    });

    it("should pass optional fields as null when not provided", async () => {
      (mockMeetingRepo.create as jest.Mock).mockResolvedValue(baseMeeting);

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
      (mockMeetingRepo.findAllForSalesRep as jest.Mock).mockResolvedValue(meetings);

      const result = await service.findAll(salesRepId);

      expect(result).toHaveLength(2);
      expect(mockMeetingRepo.findAllForSalesRep).toHaveBeenCalledWith(salesRepId, 500);
    });

    it("should return empty array when no meetings exist", async () => {
      (mockMeetingRepo.findAllForSalesRep as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(salesRepId);

      expect(result).toEqual([]);
    });
  });

  describe("findUpcoming", () => {
    it("should find upcoming scheduled meetings within default 7 days", async () => {
      (mockMeetingRepo.findUpcoming as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.findUpcoming(salesRepId);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.findUpcoming).toHaveBeenCalledWith(
        salesRepId,
        expect.any(Date),
        expect.any(Date),
      );
    });

    it("should accept custom days parameter", async () => {
      (mockMeetingRepo.findUpcoming as jest.Mock).mockResolvedValue([]);

      await service.findUpcoming(salesRepId, 14);

      expect(mockMeetingRepo.findUpcoming).toHaveBeenCalled();
    });
  });

  describe("findByDateRange", () => {
    it("should find meetings between start and end dates", async () => {
      const start = fromISO("2026-01-01T00:00:00Z").toJSDate();
      const end = fromISO("2026-01-31T23:59:59Z").toJSDate();
      (mockMeetingRepo.findByDateRange as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.findByDateRange(salesRepId, start, end);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.findByDateRange).toHaveBeenCalledWith(salesRepId, start, end);
    });
  });

  describe("findOne", () => {
    it("should return a meeting when found", async () => {
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(baseMeeting);

      const result = await service.findOne(salesRepId, meetingId);

      expect(result.id).toBe(meetingId);
      expect(mockMeetingRepo.findOneForSalesRep).toHaveBeenCalledWith(salesRepId, meetingId);
    });

    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(salesRepId, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOneWithDetails", () => {
    it("should return meeting with recording and transcript", async () => {
      const mockRecording = { id: 1, meetingId };
      const mockTranscript = { id: 1, recordingId: 1 };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(baseMeeting);
      (mockRecordingRepo.findByMeetingId as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findByRecordingId as jest.Mock).mockResolvedValue(mockTranscript);

      const result = await service.findOneWithDetails(salesRepId, meetingId);

      expect(result.meeting.id).toBe(meetingId);
      expect(result.recording).toEqual(mockRecording);
      expect(result.transcript).toEqual(mockTranscript);
    });

    it("should return null recording and transcript when no recording exists", async () => {
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(baseMeeting);
      (mockRecordingRepo.findByMeetingId as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneWithDetails(salesRepId, meetingId);

      expect(result.meeting.id).toBe(meetingId);
      expect(result.recording).toBeNull();
      expect(result.transcript).toBeNull();
    });

    it("should return null transcript when recording exists but no transcript", async () => {
      const mockRecording = { id: 1, meetingId };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(baseMeeting);
      (mockRecordingRepo.findByMeetingId as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findByRecordingId as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneWithDetails(salesRepId, meetingId);

      expect(result.recording).toEqual(mockRecording);
      expect(result.transcript).toBeNull();
    });
  });

  describe("update", () => {
    it("should update meeting fields", async () => {
      const existingMeeting = { ...baseMeeting };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(existingMeeting);
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
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(existingMeeting);
      (mockProspectRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.update(salesRepId, meetingId, { prospectId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(null);

      await expect(service.update(salesRepId, 999, { title: "Updated" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should update scheduledStart and scheduledEnd as Date objects", async () => {
      const existingMeeting = { ...baseMeeting };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(existingMeeting);
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
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.start(salesRepId, meetingId, {
        actualStart: "2026-01-15T10:05:00Z",
      });

      expect(result.status).toBe(MeetingStatus.IN_PROGRESS);
      expect(result.actualStart).toEqual(fromISO("2026-01-15T10:05:00Z").toJSDate());
    });

    it("should throw BadRequestException if meeting is already in progress", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(service.start(salesRepId, meetingId, {})).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if meeting is completed", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(service.start(salesRepId, meetingId, {})).rejects.toThrow(BadRequestException);
    });

    it("should default actualStart to now when not provided", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.start(salesRepId, meetingId, {});

      expect(result.actualStart).toBeDefined();
      expect(result.status).toBe(MeetingStatus.IN_PROGRESS);
    });
  });

  describe("end", () => {
    it("should end an in-progress meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
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
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(service.end(salesRepId, meetingId, {})).rejects.toThrow(BadRequestException);
    });

    it("should default actualEnd to now when not provided", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.end(salesRepId, meetingId, {});

      expect(result.actualEnd).toBeDefined();
      expect(result.status).toBe(MeetingStatus.COMPLETED);
    });
  });

  describe("cancel", () => {
    it("should cancel a scheduled meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.cancel(salesRepId, meetingId);

      expect(result.status).toBe(MeetingStatus.CANCELLED);
    });

    it("should throw BadRequestException when cancelling a completed meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(service.cancel(salesRepId, meetingId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("markNoShow", () => {
    it("should mark meeting as no-show", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
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
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.reschedule(salesRepId, meetingId, rescheduleDto);

      expect(result.scheduledStart).toEqual(fromISO("2026-02-01T10:00:00Z").toJSDate());
      expect(result.scheduledEnd).toEqual(fromISO("2026-02-01T11:00:00Z").toJSDate());
    });

    it("should reactivate a cancelled meeting when rescheduled", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.CANCELLED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);
      (mockMeetingRepo.save as jest.Mock).mockImplementation((m) => Promise.resolve(m));

      const result = await service.reschedule(salesRepId, meetingId, rescheduleDto);

      expect(result.status).toBe(MeetingStatus.SCHEDULED);
    });

    it("should throw BadRequestException for completed meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(service.reschedule(salesRepId, meetingId, rescheduleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for in-progress meeting", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(service.reschedule(salesRepId, meetingId, rescheduleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when end time is before start time", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

      await expect(
        service.reschedule(salesRepId, meetingId, {
          scheduledStart: "2026-02-01T12:00:00Z",
          scheduledEnd: "2026-02-01T10:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when end time equals start time", async () => {
      const meeting = { ...baseMeeting, status: MeetingStatus.SCHEDULED };
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(meeting);

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
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(baseMeeting);

      await service.remove(salesRepId, meetingId);

      expect(mockMeetingRepo.remove).toHaveBeenCalledWith(baseMeeting);
    });

    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockMeetingRepo.findOneForSalesRep as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(salesRepId, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("todaysMeetings", () => {
    it("should return meetings for today", async () => {
      (mockMeetingRepo.findTodays as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.todaysMeetings(salesRepId);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.findTodays).toHaveBeenCalled();
    });
  });

  describe("activeMeeting", () => {
    it("should return the active meeting", async () => {
      const activeMeeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      (mockMeetingRepo.findActive as jest.Mock).mockResolvedValue(activeMeeting);

      const result = await service.activeMeeting(salesRepId);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(MeetingStatus.IN_PROGRESS);
      expect(mockMeetingRepo.findActive).toHaveBeenCalledWith(salesRepId);
    });

    it("should return null when no active meeting", async () => {
      (mockMeetingRepo.findActive as jest.Mock).mockResolvedValue(null);

      const result = await service.activeMeeting(salesRepId);

      expect(result).toBeNull();
    });
  });

  describe("meetingsWithRecordings", () => {
    it("should return empty array when no recordings exist", async () => {
      (mockRecordingRepo.findAllSelectMeetingId as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsWithRecordings(salesRepId);

      expect(result).toEqual([]);
    });

    it("should query meetings that have recordings", async () => {
      const recordings = [{ meetingId: 1 }, { meetingId: 2 }];
      (mockRecordingRepo.findAllSelectMeetingId as jest.Mock).mockResolvedValue(recordings);

      (mockMeetingRepo.findWithProspectInIds as jest.Mock).mockResolvedValue([baseMeeting]);

      const result = await service.meetingsWithRecordings(salesRepId);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.findWithProspectInIds).toHaveBeenCalledWith(salesRepId, [1, 2]);
    });
  });

  describe("meetingsPendingTranscription", () => {
    it("should return empty array when no completed recordings exist", async () => {
      (mockRecordingRepo.findCompletedSelectIdMeetingId as jest.Mock).mockResolvedValue([]);
      (mockTranscriptRepo.findAllSelectRecordingId as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsPendingTranscription(salesRepId);

      expect(result).toEqual([]);
    });

    it("should return meetings with completed recordings but no transcripts", async () => {
      const completedRecordings = [
        { id: 10, meetingId: 1, processingStatus: RecordingProcessingStatus.COMPLETED },
        { id: 20, meetingId: 2, processingStatus: RecordingProcessingStatus.COMPLETED },
      ];
      const transcripts = [{ recordingId: 10 }];

      (mockRecordingRepo.findCompletedSelectIdMeetingId as jest.Mock).mockResolvedValue(
        completedRecordings,
      );
      (mockTranscriptRepo.findAllSelectRecordingId as jest.Mock).mockResolvedValue(transcripts);

      (mockMeetingRepo.findWithProspectInIds as jest.Mock).mockResolvedValue([
        { ...baseMeeting, id: 2 },
      ]);

      const result = await service.meetingsPendingTranscription(salesRepId);

      expect(result).toHaveLength(1);
      expect(mockMeetingRepo.findWithProspectInIds).toHaveBeenCalledWith(salesRepId, [2]);
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
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({
          ...baseMeeting,
          ...data,
          id: 5,
        }),
      );

      const result = await service.createFromCalendarEvent(salesRepId, calendarEventId, {});

      expect(result.meeting.title).toBe("Calendar Meeting");
      expect(result.calendarProvider).toBe("google");
      expect(result.meetingUrl).toBeNull();
    });

    it("should throw NotFoundException when calendar event does not exist", async () => {
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(null);

      await expect(service.createFromCalendarEvent(salesRepId, 999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when connection does not belong to user", async () => {
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue({
        id: 5,
        userId: 999,
      });

      await expect(
        service.createFromCalendarEvent(salesRepId, calendarEventId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when meeting already exists for calendar event", async () => {
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue({
        id: 99,
        calendarEventId,
      });

      await expect(
        service.createFromCalendarEvent(salesRepId, calendarEventId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("should use override title when provided", async () => {
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({
          ...baseMeeting,
          ...data,
        }),
      );

      const result = await service.createFromCalendarEvent(salesRepId, calendarEventId, {
        overrideTitle: "Custom Title",
      });

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Custom Title" }),
      );
    });

    it("should infer VIDEO meeting type when event has meetingUrl", async () => {
      const eventWithUrl = { ...mockCalendarEvent, meetingUrl: "https://meet.google.com/abc" };
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(eventWithUrl);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({
          ...baseMeeting,
          ...data,
        }),
      );

      await service.createFromCalendarEvent(salesRepId, calendarEventId, {});

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ meetingType: MeetingType.VIDEO }),
      );
    });

    it("should infer PHONE meeting type when location contains phone", async () => {
      const eventWithPhone = { ...mockCalendarEvent, location: "Phone call" };
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(eventWithPhone);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({
          ...baseMeeting,
          ...data,
        }),
      );

      await service.createFromCalendarEvent(salesRepId, calendarEventId, {});

      expect(mockMeetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ meetingType: MeetingType.PHONE }),
      );
    });

    it("should merge calendar attendees with additional attendees", async () => {
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({
          ...baseMeeting,
          ...data,
        }),
      );

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
      (mockCalendarEventRepo.findWithConnection as jest.Mock).mockResolvedValue(mockCalendarEvent);
      (mockCalendarConnectionRepo.findById as jest.Mock).mockResolvedValue(mockConnection);
      (mockMeetingRepo.findByCalendarEventId as jest.Mock).mockResolvedValue(null);
      (mockProspectRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createFromCalendarEvent(salesRepId, calendarEventId, { prospectId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
