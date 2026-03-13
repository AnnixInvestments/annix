import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { BookingLink } from "../entities/booking-link.entity";
import { MeetingType } from "../entities/meeting.entity";
import { BookingService } from "../services/booking.service";
import { BookingController } from "./booking.controller";

describe("BookingController", () => {
  let controller: BookingController;
  let service: jest.Mocked<BookingService>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  const mockLink: BookingLink = {
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
    user: undefined as any,
  };

  beforeEach(async () => {
    const mockService = {
      createLink: jest.fn(),
      updateLink: jest.fn(),
      deleteLink: jest.fn(),
      userLinks: jest.fn(),
      linkById: jest.fn(),
      publicLinkDetails: jest.fn(),
      availableSlots: jest.fn(),
      bookSlot: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [{ provide: BookingService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookingController>(BookingController);
    service = module.get(BookingService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a booking link and return response dto", async () => {
      const dto = { name: "Discovery Call", meetingType: MeetingType.VIDEO };
      service.createLink.mockResolvedValue(mockLink);

      const result = await controller.create(mockRequest as any, dto as any);

      expect(service.createLink).toHaveBeenCalledWith(100, dto);
      expect(result.id).toBe(1);
      expect(result.bookingUrl).toBe("/book/abc-123");
    });
  });

  describe("list", () => {
    it("should return all booking links mapped to response dtos", async () => {
      const links = [mockLink, { ...mockLink, id: 2, slug: "def-456" }];
      service.userLinks.mockResolvedValue(links as BookingLink[]);

      const result = await controller.list(mockRequest as any);

      expect(service.userLinks).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(2);
      expect(result[0].bookingUrl).toBe("/book/abc-123");
      expect(result[1].bookingUrl).toBe("/book/def-456");
    });

    it("should return empty array when user has no links", async () => {
      service.userLinks.mockResolvedValue([]);

      const result = await controller.list(mockRequest as any);

      expect(result).toEqual([]);
    });
  });

  describe("detail", () => {
    it("should return a single booking link by id", async () => {
      service.linkById.mockResolvedValue(mockLink);

      const result = await controller.detail(mockRequest as any, 1);

      expect(service.linkById).toHaveBeenCalledWith(100, 1);
      expect(result.id).toBe(1);
      expect(result.slug).toBe("abc-123");
    });
  });

  describe("update", () => {
    it("should update the booking link and return response dto", async () => {
      const updatedLink = { ...mockLink, name: "Updated Call" };
      service.updateLink.mockResolvedValue(updatedLink as BookingLink);

      const result = await controller.update(mockRequest as any, 1, { name: "Updated Call" });

      expect(service.updateLink).toHaveBeenCalledWith(100, 1, { name: "Updated Call" });
      expect(result.name).toBe("Updated Call");
    });
  });

  describe("delete", () => {
    it("should delete the booking link", async () => {
      service.deleteLink.mockResolvedValue(undefined);

      await controller.delete(mockRequest as any, 1);

      expect(service.deleteLink).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("toResponseDto", () => {
    it("should include all expected fields in the response", async () => {
      service.linkById.mockResolvedValue(mockLink);

      const result = await controller.detail(mockRequest as any, 1);

      expect(result).toEqual({
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
        bookingUrl: "/book/abc-123",
      });
    });
  });
});
