import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { Visit, VisitType } from "../entities/visit.entity";
import { VisitService } from "../services";
import { VisitController } from "./visit.controller";

describe("VisitController", () => {
  let controller: VisitController;
  let service: jest.Mocked<VisitService>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  const sampleVisit = (overrides: Partial<Visit> = {}): Visit =>
    ({
      id: 1,
      prospectId: 10,
      salesRepId: 100,
      visitType: VisitType.SCHEDULED,
      scheduledAt: testDate,
      startedAt: null,
      endedAt: null,
      checkInLatitude: null,
      checkInLongitude: null,
      checkOutLatitude: null,
      checkOutLongitude: null,
      outcome: null,
      notes: null,
      contactMet: null,
      nextSteps: null,
      followUpDate: null,
      createdAt: testDate,
      prospect: { id: 10, companyName: "Test Prospect" },
      ...overrides,
    }) as Visit;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      todaysSchedule: jest.fn(),
      activeVisit: jest.fn(),
      findByProspect: jest.fn(),
      findByDateRange: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      startColdCall: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitController],
      providers: [{ provide: VisitService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VisitController>(VisitController);
    service = module.get(VisitService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / (create)", () => {
    it("should create a visit and pass userId from request", async () => {
      const visit = sampleVisit();
      service.create.mockResolvedValue(visit);

      const dto = { prospectId: 10, visitType: VisitType.SCHEDULED };
      const result = await controller.create(mockRequest as any, dto);

      expect(result).toBe(visit);
      expect(service.create).toHaveBeenCalledWith(100, dto);
    });
  });

  describe("GET / (findAll)", () => {
    it("should return all visits for the current user", async () => {
      const visits = [sampleVisit(), sampleVisit({ id: 2 })];
      service.findAll.mockResolvedValue(visits);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledWith(100);
    });
  });

  describe("GET /today (todaysSchedule)", () => {
    it("should return today's scheduled visits", async () => {
      const visits = [sampleVisit()];
      service.todaysSchedule.mockResolvedValue(visits);

      const result = await controller.todaysSchedule(mockRequest as any);

      expect(result).toHaveLength(1);
      expect(service.todaysSchedule).toHaveBeenCalledWith(100);
    });
  });

  describe("GET /active (activeVisit)", () => {
    it("should return the active visit", async () => {
      const active = sampleVisit({ startedAt: testDate });
      service.activeVisit.mockResolvedValue(active);

      const result = await controller.activeVisit(mockRequest as any);

      expect(result).toBe(active);
      expect(service.activeVisit).toHaveBeenCalledWith(100);
    });

    it("should return null when no active visit", async () => {
      service.activeVisit.mockResolvedValue(null);

      const result = await controller.activeVisit(mockRequest as any);

      expect(result).toBeNull();
    });
  });

  describe("GET /prospect/:prospectId (findByProspect)", () => {
    it("should return visits for a specific prospect", async () => {
      const visits = [sampleVisit()];
      service.findByProspect.mockResolvedValue(visits);

      const result = await controller.findByProspect(10);

      expect(result).toHaveLength(1);
      expect(service.findByProspect).toHaveBeenCalledWith(10);
    });
  });

  describe("GET /range (findByDateRange)", () => {
    it("should convert ISO date strings and pass to service", async () => {
      const visits = [sampleVisit()];
      service.findByDateRange.mockResolvedValue(visits);

      const result = await controller.findByDateRange(
        mockRequest as any,
        "2026-01-01T00:00:00Z",
        "2026-01-31T23:59:59Z",
      );

      expect(result).toHaveLength(1);
      expect(service.findByDateRange).toHaveBeenCalledWith(
        100,
        fromISO("2026-01-01T00:00:00Z").toJSDate(),
        fromISO("2026-01-31T23:59:59Z").toJSDate(),
      );
    });
  });

  describe("GET /:id (findOne)", () => {
    it("should return a visit by ID", async () => {
      const visit = sampleVisit();
      service.findOne.mockResolvedValue(visit);

      const result = await controller.findOne(mockRequest as any, 1);

      expect(result.id).toBe(1);
      expect(service.findOne).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("PATCH /:id (update)", () => {
    it("should update a visit", async () => {
      const updated = sampleVisit({ notes: "Updated" });
      service.update.mockResolvedValue(updated);

      const dto = { notes: "Updated" };
      const result = await controller.update(mockRequest as any, 1, dto);

      expect(result.notes).toBe("Updated");
      expect(service.update).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("POST /:id/check-in (checkIn)", () => {
    it("should check in to a visit with coordinates", async () => {
      const checkedIn = sampleVisit({ startedAt: testDate, checkInLatitude: -26.2041 });
      service.checkIn.mockResolvedValue(checkedIn);

      const dto = { latitude: -26.2041, longitude: 28.0473 };
      const result = await controller.checkIn(mockRequest as any, 1, dto);

      expect(result.startedAt).toBeDefined();
      expect(service.checkIn).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("POST /:id/check-out (checkOut)", () => {
    it("should check out from a visit with coordinates", async () => {
      const checkedOut = sampleVisit({ startedAt: testDate, endedAt: testDate });
      service.checkOut.mockResolvedValue(checkedOut);

      const dto = { latitude: -26.2041, longitude: 28.0473 };
      const result = await controller.checkOut(mockRequest as any, 1, dto);

      expect(result.endedAt).toBeDefined();
      expect(service.checkOut).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("POST /cold-call (startColdCall)", () => {
    it("should start a cold call visit with parsed coordinates", async () => {
      const coldCall = sampleVisit({ visitType: VisitType.COLD_CALL });
      service.startColdCall.mockResolvedValue(coldCall);

      const result = await controller.startColdCall(mockRequest as any, 10, "-26.2041", "28.0473");

      expect(result.visitType).toBe(VisitType.COLD_CALL);
      expect(service.startColdCall).toHaveBeenCalledWith(100, 10, -26.2041, 28.0473);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delete a visit", async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockRequest as any, 1);

      expect(service.remove).toHaveBeenCalledWith(100, 1);
    });
  });
});
