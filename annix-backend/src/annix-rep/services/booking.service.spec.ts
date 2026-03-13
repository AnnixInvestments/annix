import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import { User } from "../../user/entities/user.entity";
import { BookingLink } from "../entities/booking-link.entity";
import { Meeting, MeetingStatus, MeetingType } from "../entities/meeting.entity";
import { BookingService } from "./booking.service";

describe("BookingService", () => {
  let service: BookingService;
  let mockBookingLinkRepo: Partial<Repository<BookingLink>>;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockUserRepo: Partial<Repository<User>>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockBookingLink = (overrides: Partial<BookingLink> = {}): BookingLink =>
    ({
      id: 1,
      userId: 100,
      slug: "abc-123",
      name: "30 Minute Call",
      meetingDurationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      availableDays: "1,2,3,4,5",
      availableStartHour: 8,
      availableEndHour: 17,
      maxDaysAhead: 30,
      isActive: true,
      customQuestions: null,
      meetingType: MeetingType.VIDEO,
      location: null,
      description: null,
      createdAt: testDate,
      updatedAt: testDate,
      user: {
        id: 100,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      } as User,
      ...overrides,
    }) as BookingLink;

  beforeEach(async () => {
    mockBookingLinkRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    mockMeetingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(BookingLink),
          useValue: mockBookingLinkRepo,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createLink", () => {
    it("should create a booking link with provided values", async () => {
      const dto = {
        name: "Discovery Call",
        meetingDurationMinutes: 45,
        meetingType: MeetingType.VIDEO,
      };
      const created = mockBookingLink({ name: "Discovery Call", meetingDurationMinutes: 45 });
      (mockBookingLinkRepo.create as jest.Mock).mockReturnValue(created);
      (mockBookingLinkRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.createLink(100, dto);

      expect(result.name).toBe("Discovery Call");
      expect(mockBookingLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          name: "Discovery Call",
          meetingDurationMinutes: 45,
        }),
      );
    });

    it("should use default values when optional fields are not provided", async () => {
      const dto = { name: "Quick Chat" };
      const created = mockBookingLink({ name: "Quick Chat" });
      (mockBookingLinkRepo.create as jest.Mock).mockReturnValue(created);
      (mockBookingLinkRepo.save as jest.Mock).mockResolvedValue(created);

      await service.createLink(100, dto as any);

      expect(mockBookingLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingDurationMinutes: 30,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          availableDays: "1,2,3,4,5",
          availableStartHour: 8,
          availableEndHour: 17,
          maxDaysAhead: 30,
        }),
      );
    });
  });

  describe("updateLink", () => {
    it("should update link fields and return updated link", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockBookingLinkRepo.save as jest.Mock).mockResolvedValue({
        ...link,
        name: "Updated Name",
      });

      const result = await service.updateLink(100, 1, { name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
      expect(mockBookingLinkRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when link does not exist", async () => {
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateLink(100, 999, { name: "Updated" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should only update fields that are provided in dto", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockBookingLinkRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.updateLink(100, 1, { meetingDurationMinutes: 60 });

      expect(link.meetingDurationMinutes).toBe(60);
      expect(link.name).toBe("30 Minute Call");
    });

    it("should update isActive flag", async () => {
      const link = mockBookingLink({ isActive: true });
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockBookingLinkRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.updateLink(100, 1, { isActive: false });

      expect(link.isActive).toBe(false);
    });
  });

  describe("deleteLink", () => {
    it("should delete the booking link", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockBookingLinkRepo.remove as jest.Mock).mockResolvedValue(link);

      await service.deleteLink(100, 1);

      expect(mockBookingLinkRepo.remove).toHaveBeenCalledWith(link);
    });

    it("should throw NotFoundException when link does not exist", async () => {
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteLink(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("userLinks", () => {
    it("should return all links for the user ordered by createdAt DESC", async () => {
      const links = [mockBookingLink({ id: 2 }), mockBookingLink({ id: 1 })];
      (mockBookingLinkRepo.find as jest.Mock).mockResolvedValue(links);

      const result = await service.userLinks(100);

      expect(result).toHaveLength(2);
      expect(mockBookingLinkRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when user has no links", async () => {
      (mockBookingLinkRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.userLinks(100);

      expect(result).toEqual([]);
    });
  });

  describe("linkById", () => {
    it("should return the link when found", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);

      const result = await service.linkById(100, 1);

      expect(result.id).toBe(1);
      expect(mockBookingLinkRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 100 },
      });
    });

    it("should throw NotFoundException when link does not exist", async () => {
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.linkById(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("publicLinkDetails", () => {
    it("should return public details for an active link", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);

      const result = await service.publicLinkDetails("abc-123");

      expect(result.slug).toBe("abc-123");
      expect(result.name).toBe("30 Minute Call");
      expect(result.hostName).toBe("John Doe");
      expect(result.meetingDurationMinutes).toBe(30);
    });

    it("should throw NotFoundException for inactive or missing link", async () => {
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.publicLinkDetails("nonexistent")).rejects.toThrow(NotFoundException);
    });

    it("should fall back to email when user has no first/last name", async () => {
      const link = mockBookingLink({
        user: {
          id: 100,
          firstName: "",
          lastName: "",
          email: "john@example.com",
        } as User,
      });
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);

      const result = await service.publicLinkDetails("abc-123");

      expect(result.hostName).toBe("john@example.com");
    });
  });

  describe("availableSlots", () => {
    it("should throw NotFoundException when link is not found", async () => {
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.availableSlots("nonexistent", "2026-01-20")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return empty array when requested day is not in available days", async () => {
      const link = mockBookingLink({ availableDays: "1,2,3,4,5" });
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);

      const result = await service.availableSlots("abc-123", "2026-01-18");

      expect(result).toEqual([]);
    });
  });

  describe("bookSlot", () => {
    it("should create a meeting for the booked slot", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      const createdMeeting = {
        id: 42,
        title: "Meeting with Test User",
        salesRepId: 100,
        status: MeetingStatus.SCHEDULED,
        scheduledStart: fromISO("2026-01-20T10:00:00Z").toJSDate(),
        scheduledEnd: fromISO("2026-01-20T10:30:00Z").toJSDate(),
      };
      (mockMeetingRepo.create as jest.Mock).mockReturnValue(createdMeeting);
      (mockMeetingRepo.save as jest.Mock).mockResolvedValue(createdMeeting);

      const result = await service.bookSlot("abc-123", {
        startTime: "2026-01-20T10:00:00Z",
        name: "Test User",
        email: "test@example.com",
      });

      expect(result.meetingId).toBe(42);
      expect(result.title).toBe("Meeting with Test User");
      expect(result.hostName).toBe("John Doe");
      expect(result.hostEmail).toBe("john@example.com");
      expect(result.meetingType).toBe(MeetingType.VIDEO);
    });

    it("should throw NotFoundException when booking link is not found", async () => {
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.bookSlot("nonexistent", {
          startTime: "2026-01-20T10:00:00Z",
          name: "Test User",
          email: "test@example.com",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when time slot conflicts", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue({ id: 99 });

      await expect(
        service.bookSlot("abc-123", {
          startTime: "2026-01-20T10:00:00Z",
          name: "Test User",
          email: "test@example.com",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should include custom answers in meeting description", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      const createdMeeting = { id: 42, title: "Meeting with Test User" };
      (mockMeetingRepo.create as jest.Mock).mockReturnValue(createdMeeting);
      (mockMeetingRepo.save as jest.Mock).mockResolvedValue(createdMeeting);

      await service.bookSlot("abc-123", {
        startTime: "2026-01-20T10:00:00Z",
        name: "Test User",
        email: "test@example.com",
        customAnswers: { "Company Size": "50-100" },
      });

      const createArg = (mockMeetingRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.description).toContain("Company Size: 50-100");
    });

    it("should include notes in meeting description when provided", async () => {
      const link = mockBookingLink();
      (mockBookingLinkRepo.findOne as jest.Mock).mockResolvedValue(link);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      const createdMeeting = { id: 42, title: "Meeting with Test User" };
      (mockMeetingRepo.create as jest.Mock).mockReturnValue(createdMeeting);
      (mockMeetingRepo.save as jest.Mock).mockResolvedValue(createdMeeting);

      await service.bookSlot("abc-123", {
        startTime: "2026-01-20T10:00:00Z",
        name: "Test User",
        email: "test@example.com",
        notes: "Looking forward to this meeting",
      });

      const createArg = (mockMeetingRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.description).toContain("Notes: Looking forward to this meeting");
    });
  });
});
