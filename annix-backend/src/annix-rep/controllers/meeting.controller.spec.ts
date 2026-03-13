import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { MeetingStatus, MeetingType } from "../entities";
import { MeetingService, RecurringMeetingService } from "../services";
import { MeetingController } from "./meeting.controller";

describe("MeetingController", () => {
  let controller: MeetingController;
  let meetingService: jest.Mocked<MeetingService>;
  let recurringMeetingService: jest.Mocked<RecurringMeetingService>;

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  const baseMeeting = {
    id: 1,
    salesRepId: 100,
    prospectId: null,
    calendarEventId: null,
    title: "Discovery Call",
    description: null,
    meetingType: MeetingType.IN_PERSON,
    status: MeetingStatus.SCHEDULED,
    scheduledStart: fromISO("2026-01-15T10:00:00Z").toJSDate(),
    scheduledEnd: fromISO("2026-01-15T11:00:00Z").toJSDate(),
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
    isRecurring: false,
    recurrenceRule: null,
    recurringParentId: null,
    recurrenceExceptionDates: null,
    createdAt: fromISO("2026-01-14T08:00:00Z").toJSDate(),
    updatedAt: fromISO("2026-01-14T08:00:00Z").toJSDate(),
  };

  beforeEach(async () => {
    const mockMeetingService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findUpcoming: jest.fn(),
      findByDateRange: jest.fn(),
      findOne: jest.fn(),
      findOneWithDetails: jest.fn(),
      update: jest.fn(),
      start: jest.fn(),
      end: jest.fn(),
      cancel: jest.fn(),
      markNoShow: jest.fn(),
      reschedule: jest.fn(),
      remove: jest.fn(),
      todaysMeetings: jest.fn(),
      activeMeeting: jest.fn(),
      meetingsWithRecordings: jest.fn(),
      meetingsPendingTranscription: jest.fn(),
      createFromCalendarEvent: jest.fn(),
    };

    const mockRecurringMeetingService = {
      createRecurring: jest.fn(),
      expandRecurringMeetings: jest.fn(),
      seriesInstances: jest.fn(),
      updateSeries: jest.fn(),
      deleteFromSeries: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingController],
      providers: [
        { provide: MeetingService, useValue: mockMeetingService },
        { provide: RecurringMeetingService, useValue: mockRecurringMeetingService },
      ],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MeetingController>(MeetingController);
    meetingService = module.get(MeetingService);
    recurringMeetingService = module.get(RecurringMeetingService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / (create)", () => {
    it("should delegate to meetingService.create with userId and dto", () => {
      const dto = {
        title: "Discovery Call",
        scheduledStart: "2026-01-15T10:00:00Z",
        scheduledEnd: "2026-01-15T11:00:00Z",
        meetingType: MeetingType.IN_PERSON,
      };
      meetingService.create.mockResolvedValue(baseMeeting as any);

      const result = controller.create(mockRequest as any, dto);

      expect(meetingService.create).toHaveBeenCalledWith(100, dto);
      expect(result).resolves.toEqual(baseMeeting);
    });
  });

  describe("POST /from-calendar/:eventId (createFromCalendar)", () => {
    it("should create meeting from calendar and flatten response", async () => {
      const calendarResult = {
        meeting: { ...baseMeeting, calendarEventId: 50 },
        calendarProvider: "google",
        meetingUrl: "https://meet.google.com/abc",
      };
      meetingService.createFromCalendarEvent.mockResolvedValue(calendarResult as any);

      const result = await controller.createFromCalendar(mockRequest as any, 50, {});

      expect(meetingService.createFromCalendarEvent).toHaveBeenCalledWith(100, 50, {});
      expect(result.calendarProvider).toBe("google");
      expect(result.meetingUrl).toBe("https://meet.google.com/abc");
      expect(result.calendarEventId).toBe(50);
    });
  });

  describe("GET / (findAll)", () => {
    it("should return all meetings for the user", () => {
      meetingService.findAll.mockResolvedValue([baseMeeting] as any);

      const result = controller.findAll(mockRequest as any);

      expect(meetingService.findAll).toHaveBeenCalledWith(100);
      expect(result).resolves.toHaveLength(1);
    });
  });

  describe("GET /today (todaysMeetings)", () => {
    it("should return today's meetings", () => {
      meetingService.todaysMeetings.mockResolvedValue([baseMeeting] as any);

      const result = controller.todaysMeetings(mockRequest as any);

      expect(meetingService.todaysMeetings).toHaveBeenCalledWith(100);
      expect(result).resolves.toHaveLength(1);
    });
  });

  describe("GET /upcoming (findUpcoming)", () => {
    it("should default to 7 days when no days param provided", () => {
      meetingService.findUpcoming.mockResolvedValue([]);

      controller.findUpcoming(mockRequest as any);

      expect(meetingService.findUpcoming).toHaveBeenCalledWith(100, 7);
    });

    it("should parse days query parameter as integer", () => {
      meetingService.findUpcoming.mockResolvedValue([]);

      controller.findUpcoming(mockRequest as any, "14");

      expect(meetingService.findUpcoming).toHaveBeenCalledWith(100, 14);
    });
  });

  describe("GET /active (activeMeeting)", () => {
    it("should return active meeting", () => {
      const activeMeeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      meetingService.activeMeeting.mockResolvedValue(activeMeeting as any);

      const result = controller.activeMeeting(mockRequest as any);

      expect(meetingService.activeMeeting).toHaveBeenCalledWith(100);
      expect(result).resolves.toEqual(activeMeeting);
    });

    it("should return null when no active meeting", () => {
      meetingService.activeMeeting.mockResolvedValue(null);

      const result = controller.activeMeeting(mockRequest as any);

      expect(result).resolves.toBeNull();
    });
  });

  describe("GET /with-recordings (meetingsWithRecordings)", () => {
    it("should delegate to meetingService.meetingsWithRecordings", () => {
      meetingService.meetingsWithRecordings.mockResolvedValue([baseMeeting] as any);

      const result = controller.meetingsWithRecordings(mockRequest as any);

      expect(meetingService.meetingsWithRecordings).toHaveBeenCalledWith(100);
      expect(result).resolves.toHaveLength(1);
    });
  });

  describe("GET /pending-transcription (meetingsPendingTranscription)", () => {
    it("should delegate to meetingService.meetingsPendingTranscription", () => {
      meetingService.meetingsPendingTranscription.mockResolvedValue([]);

      const result = controller.meetingsPendingTranscription(mockRequest as any);

      expect(meetingService.meetingsPendingTranscription).toHaveBeenCalledWith(100);
      expect(result).resolves.toEqual([]);
    });
  });

  describe("GET /range (findByDateRange)", () => {
    it("should parse ISO date strings and pass to service", () => {
      meetingService.findByDateRange.mockResolvedValue([baseMeeting] as any);

      controller.findByDateRange(mockRequest as any, "2026-01-01T00:00:00Z", "2026-01-31T23:59:59Z");

      expect(meetingService.findByDateRange).toHaveBeenCalledWith(
        100,
        fromISO("2026-01-01T00:00:00Z").toJSDate(),
        fromISO("2026-01-31T23:59:59Z").toJSDate(),
      );
    });
  });

  describe("GET /:id (findOne)", () => {
    it("should delegate to meetingService.findOne", () => {
      meetingService.findOne.mockResolvedValue(baseMeeting as any);

      const result = controller.findOne(mockRequest as any, 1);

      expect(meetingService.findOne).toHaveBeenCalledWith(100, 1);
      expect(result).resolves.toEqual(baseMeeting);
    });
  });

  describe("GET /:id/details (findOneWithDetails)", () => {
    it("should delegate to meetingService.findOneWithDetails", () => {
      const details = {
        meeting: baseMeeting,
        recording: null,
        transcript: null,
      };
      meetingService.findOneWithDetails.mockResolvedValue(details as any);

      const result = controller.findOneWithDetails(mockRequest as any, 1);

      expect(meetingService.findOneWithDetails).toHaveBeenCalledWith(100, 1);
      expect(result).resolves.toEqual(details);
    });
  });

  describe("PATCH /:id (update)", () => {
    it("should delegate to meetingService.update", () => {
      const dto = { title: "Updated Title" };
      const updatedMeeting = { ...baseMeeting, title: "Updated Title" };
      meetingService.update.mockResolvedValue(updatedMeeting as any);

      const result = controller.update(mockRequest as any, 1, dto);

      expect(meetingService.update).toHaveBeenCalledWith(100, 1, dto);
      expect(result).resolves.toEqual(updatedMeeting);
    });
  });

  describe("POST /:id/start (start)", () => {
    it("should delegate to meetingService.start", () => {
      const dto = { actualStart: "2026-01-15T10:05:00Z" };
      const startedMeeting = { ...baseMeeting, status: MeetingStatus.IN_PROGRESS };
      meetingService.start.mockResolvedValue(startedMeeting as any);

      const result = controller.start(mockRequest as any, 1, dto);

      expect(meetingService.start).toHaveBeenCalledWith(100, 1, dto);
      expect(result).resolves.toEqual(startedMeeting);
    });
  });

  describe("POST /:id/end (end)", () => {
    it("should delegate to meetingService.end", () => {
      const dto = { notes: "Great meeting" };
      const endedMeeting = { ...baseMeeting, status: MeetingStatus.COMPLETED };
      meetingService.end.mockResolvedValue(endedMeeting as any);

      const result = controller.end(mockRequest as any, 1, dto);

      expect(meetingService.end).toHaveBeenCalledWith(100, 1, dto);
      expect(result).resolves.toEqual(endedMeeting);
    });
  });

  describe("POST /:id/cancel (cancel)", () => {
    it("should delegate to meetingService.cancel", () => {
      const cancelledMeeting = { ...baseMeeting, status: MeetingStatus.CANCELLED };
      meetingService.cancel.mockResolvedValue(cancelledMeeting as any);

      const result = controller.cancel(mockRequest as any, 1);

      expect(meetingService.cancel).toHaveBeenCalledWith(100, 1);
      expect(result).resolves.toEqual(cancelledMeeting);
    });
  });

  describe("POST /:id/no-show (markNoShow)", () => {
    it("should delegate to meetingService.markNoShow", () => {
      const noShowMeeting = { ...baseMeeting, status: MeetingStatus.NO_SHOW };
      meetingService.markNoShow.mockResolvedValue(noShowMeeting as any);

      const result = controller.markNoShow(mockRequest as any, 1);

      expect(meetingService.markNoShow).toHaveBeenCalledWith(100, 1);
      expect(result).resolves.toEqual(noShowMeeting);
    });
  });

  describe("PATCH /:id/reschedule (reschedule)", () => {
    it("should delegate to meetingService.reschedule", () => {
      const dto = {
        scheduledStart: "2026-02-01T10:00:00Z",
        scheduledEnd: "2026-02-01T11:00:00Z",
      };
      const rescheduled = {
        ...baseMeeting,
        scheduledStart: fromISO("2026-02-01T10:00:00Z").toJSDate(),
        scheduledEnd: fromISO("2026-02-01T11:00:00Z").toJSDate(),
      };
      meetingService.reschedule.mockResolvedValue(rescheduled as any);

      const result = controller.reschedule(mockRequest as any, 1, dto);

      expect(meetingService.reschedule).toHaveBeenCalledWith(100, 1, dto);
      expect(result).resolves.toEqual(rescheduled);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delegate to meetingService.remove", () => {
      meetingService.remove.mockResolvedValue(undefined);

      const result = controller.remove(mockRequest as any, 1);

      expect(meetingService.remove).toHaveBeenCalledWith(100, 1);
      expect(result).resolves.toBeUndefined();
    });
  });

  describe("POST /recurring (createRecurring)", () => {
    it("should delegate to recurringMeetingService.createRecurring", () => {
      const dto = {
        title: "Weekly Standup",
        scheduledStart: "2026-01-15T09:00:00Z",
        scheduledEnd: "2026-01-15T09:30:00Z",
        recurrence: { frequency: "weekly" as const, endType: "never" as const },
      };
      recurringMeetingService.createRecurring.mockResolvedValue([baseMeeting] as any);

      const result = controller.createRecurring(mockRequest as any, dto);

      expect(recurringMeetingService.createRecurring).toHaveBeenCalledWith(100, dto);
      expect(result).resolves.toEqual([baseMeeting]);
    });
  });

  describe("GET /recurring/expanded (expandedRecurringMeetings)", () => {
    it("should parse dates and delegate to recurringMeetingService", () => {
      recurringMeetingService.expandRecurringMeetings.mockResolvedValue([]);

      controller.expandedRecurringMeetings(
        mockRequest as any,
        "2026-01-01T00:00:00Z",
        "2026-01-31T23:59:59Z",
      );

      expect(recurringMeetingService.expandRecurringMeetings).toHaveBeenCalledWith(
        100,
        fromISO("2026-01-01T00:00:00Z").toJSDate(),
        fromISO("2026-01-31T23:59:59Z").toJSDate(),
      );
    });
  });

  describe("GET /recurring/:id/instances (seriesInstances)", () => {
    it("should delegate to recurringMeetingService.seriesInstances", () => {
      recurringMeetingService.seriesInstances.mockResolvedValue([]);

      const result = controller.seriesInstances(mockRequest as any, 1);

      expect(recurringMeetingService.seriesInstances).toHaveBeenCalledWith(100, 1);
      expect(result).resolves.toEqual([]);
    });
  });

  describe("PATCH /recurring/:id (updateRecurring)", () => {
    it("should extract scope and delegate to recurringMeetingService.updateSeries", () => {
      const dto = { title: "Updated Standup", scope: "all" as const };
      recurringMeetingService.updateSeries.mockResolvedValue(baseMeeting as any);

      controller.updateRecurring(mockRequest as any, 1, dto);

      expect(recurringMeetingService.updateSeries).toHaveBeenCalledWith(
        100,
        1,
        { title: "Updated Standup" },
        "all",
      );
    });
  });

  describe("DELETE /recurring/:id (deleteRecurring)", () => {
    it("should delegate to recurringMeetingService.deleteFromSeries", () => {
      recurringMeetingService.deleteFromSeries.mockResolvedValue(undefined);

      controller.deleteRecurring(mockRequest as any, 1, { scope: "this" });

      expect(recurringMeetingService.deleteFromSeries).toHaveBeenCalledWith(100, 1, "this");
    });
  });
});
