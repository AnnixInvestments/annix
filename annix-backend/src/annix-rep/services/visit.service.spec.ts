import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { fromISO } from "../../lib/datetime";
import { Prospect } from "../entities/prospect.entity";
import { Visit, VisitType } from "../entities/visit.entity";
import { VisitService } from "./visit.service";

describe("VisitService", () => {
  let service: VisitService;

  const mockVisitRepo: Partial<Record<keyof import("typeorm").Repository<Visit>, jest.Mock>> = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockProspectRepo: Partial<Record<keyof import("typeorm").Repository<Prospect>, jest.Mock>> = {
    findOne: jest.fn(),
  };

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

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
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: getRepositoryToken(Visit), useValue: mockVisitRepo },
        { provide: getRepositoryToken(Prospect), useValue: mockProspectRepo },
      ],
    }).compile();

    service = module.get<VisitService>(VisitService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a scheduled visit", async () => {
      const prospect = { id: 10, companyName: "Test Prospect" };
      mockProspectRepo.findOne!.mockResolvedValue(prospect);
      const created = sampleVisit();
      mockVisitRepo.create!.mockReturnValue(created);
      mockVisitRepo.save!.mockResolvedValue(created);

      const result = await service.create(100, {
        prospectId: 10,
        visitType: VisitType.SCHEDULED,
        scheduledAt: "2026-01-15T10:00:00Z",
        notes: "Initial meeting",
      });

      expect(result.id).toBe(1);
      expect(mockProspectRepo.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(mockVisitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prospectId: 10,
          salesRepId: 100,
          visitType: VisitType.SCHEDULED,
        }),
      );
    });

    it("should throw NotFoundException when prospect does not exist", async () => {
      mockProspectRepo.findOne!.mockResolvedValue(null);

      await expect(service.create(100, { prospectId: 999 })).rejects.toThrow(NotFoundException);
    });

    it("should default to SCHEDULED visit type when not provided", async () => {
      mockProspectRepo.findOne!.mockResolvedValue({ id: 10 });
      mockVisitRepo.create!.mockReturnValue(sampleVisit());
      mockVisitRepo.save!.mockResolvedValue(sampleVisit());

      await service.create(100, { prospectId: 10 });

      expect(mockVisitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visitType: VisitType.SCHEDULED,
        }),
      );
    });

    it("should set scheduledAt to null when not provided", async () => {
      mockProspectRepo.findOne!.mockResolvedValue({ id: 10 });
      mockVisitRepo.create!.mockReturnValue(sampleVisit());
      mockVisitRepo.save!.mockResolvedValue(sampleVisit());

      await service.create(100, { prospectId: 10 });

      expect(mockVisitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: null,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return all visits for a sales rep", async () => {
      const visits = [sampleVisit(), sampleVisit({ id: 2 })];
      mockVisitRepo.find!.mockResolvedValue(visits);

      const result = await service.findAll(100);

      expect(result).toHaveLength(2);
      expect(mockVisitRepo.find).toHaveBeenCalledWith({
        where: { salesRepId: 100 },
        relations: ["prospect"],
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when no visits exist", async () => {
      mockVisitRepo.find!.mockResolvedValue([]);

      const result = await service.findAll(100);

      expect(result).toEqual([]);
    });
  });

  describe("findByProspect", () => {
    it("should return visits for a specific prospect", async () => {
      const visits = [sampleVisit()];
      mockVisitRepo.find!.mockResolvedValue(visits);

      const result = await service.findByProspect(10);

      expect(result).toHaveLength(1);
      expect(mockVisitRepo.find).toHaveBeenCalledWith({
        where: { prospectId: 10 },
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("findByDateRange", () => {
    it("should return visits within date range", async () => {
      const startDate = fromISO("2026-01-01T00:00:00Z").toJSDate();
      const endDate = fromISO("2026-01-31T23:59:59Z").toJSDate();
      mockVisitRepo.find!.mockResolvedValue([sampleVisit()]);

      const result = await service.findByDateRange(100, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(mockVisitRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ salesRepId: 100 }),
          relations: ["prospect"],
          order: { scheduledAt: "ASC" },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a visit by ID and sales rep", async () => {
      mockVisitRepo.findOne!.mockResolvedValue(sampleVisit());

      const result = await service.findOne(100, 1);

      expect(result.id).toBe(1);
      expect(mockVisitRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, salesRepId: 100 },
        relations: ["prospect"],
      });
    });

    it("should throw NotFoundException when visit not found", async () => {
      mockVisitRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update visit fields", async () => {
      const existing = sampleVisit();
      mockVisitRepo.findOne!.mockResolvedValue(existing);
      mockVisitRepo.save!.mockResolvedValue({ ...existing, notes: "Updated notes" });

      const result = await service.update(100, 1, { notes: "Updated notes" });

      expect(result.notes).toBe("Updated notes");
      expect(mockVisitRepo.save).toHaveBeenCalled();
    });

    it("should update scheduledAt from ISO string", async () => {
      const existing = sampleVisit();
      mockVisitRepo.findOne!.mockResolvedValue(existing);
      mockVisitRepo.save!.mockImplementation((v) => Promise.resolve(v));

      await service.update(100, 1, { scheduledAt: "2026-02-01T14:00:00Z" });

      expect(mockVisitRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: fromISO("2026-02-01T14:00:00Z").toJSDate(),
        }),
      );
    });

    it("should throw NotFoundException when visit not found", async () => {
      mockVisitRepo.findOne!.mockResolvedValue(null);

      await expect(service.update(100, 999, { notes: "test" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("checkIn", () => {
    it("should check in to a visit with coordinates", async () => {
      const existing = sampleVisit({ startedAt: null });
      mockVisitRepo.findOne!.mockResolvedValue(existing);
      mockVisitRepo.save!.mockImplementation((v) => Promise.resolve(v));

      const result = await service.checkIn(100, 1, {
        latitude: -26.2041,
        longitude: 28.0473,
      });

      expect(result.startedAt).toBeDefined();
      expect(result.checkInLatitude).toBe(-26.2041);
      expect(result.checkInLongitude).toBe(28.0473);
    });

    it("should throw BadRequestException when already checked in", async () => {
      const existing = sampleVisit({ startedAt: testDate });
      mockVisitRepo.findOne!.mockResolvedValue(existing);

      await expect(
        service.checkIn(100, 1, { latitude: -26.2041, longitude: 28.0473 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("checkOut", () => {
    it("should check out from a visit with coordinates", async () => {
      const existing = sampleVisit({ startedAt: testDate, endedAt: null });
      mockVisitRepo.findOne!.mockResolvedValue(existing);
      mockVisitRepo.save!.mockImplementation((v) => Promise.resolve(v));

      const result = await service.checkOut(100, 1, {
        latitude: -26.2041,
        longitude: 28.0473,
        outcome: "successful" as any,
        notes: "Good meeting",
      });

      expect(result.endedAt).toBeDefined();
      expect(result.checkOutLatitude).toBe(-26.2041);
      expect(result.checkOutLongitude).toBe(28.0473);
      expect(result.outcome).toBe("successful");
      expect(result.notes).toBe("Good meeting");
    });

    it("should throw BadRequestException when not checked in", async () => {
      const existing = sampleVisit({ startedAt: null });
      mockVisitRepo.findOne!.mockResolvedValue(existing);

      await expect(
        service.checkOut(100, 1, { latitude: -26.2041, longitude: 28.0473 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when already checked out", async () => {
      const existing = sampleVisit({ startedAt: testDate, endedAt: testDate });
      mockVisitRepo.findOne!.mockResolvedValue(existing);

      await expect(
        service.checkOut(100, 1, { latitude: -26.2041, longitude: 28.0473 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("startColdCall", () => {
    it("should create a cold call visit with check-in", async () => {
      const prospect = { id: 10 };
      mockProspectRepo.findOne!.mockResolvedValue(prospect);
      const coldCall = sampleVisit({
        visitType: VisitType.COLD_CALL,
        checkInLatitude: -26.2041,
        checkInLongitude: 28.0473,
      });
      mockVisitRepo.create!.mockReturnValue(coldCall);
      mockVisitRepo.save!.mockResolvedValue(coldCall);

      const result = await service.startColdCall(100, 10, -26.2041, 28.0473);

      expect(result.visitType).toBe(VisitType.COLD_CALL);
      expect(mockVisitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visitType: VisitType.COLD_CALL,
          checkInLatitude: -26.2041,
          checkInLongitude: 28.0473,
        }),
      );
    });

    it("should throw NotFoundException when prospect does not exist", async () => {
      mockProspectRepo.findOne!.mockResolvedValue(null);

      await expect(service.startColdCall(100, 999, -26.2041, 28.0473)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should remove a visit", async () => {
      const existing = sampleVisit();
      mockVisitRepo.findOne!.mockResolvedValue(existing);
      mockVisitRepo.remove!.mockResolvedValue(existing);

      await service.remove(100, 1);

      expect(mockVisitRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("should throw NotFoundException when visit not found", async () => {
      mockVisitRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("todaysSchedule", () => {
    it("should return visits scheduled for today", async () => {
      mockVisitRepo.find!.mockResolvedValue([sampleVisit()]);

      const result = await service.todaysSchedule(100);

      expect(result).toHaveLength(1);
      expect(mockVisitRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ["prospect"],
          order: { scheduledAt: "ASC" },
        }),
      );
    });
  });

  describe("activeVisit", () => {
    it("should return the active visit when one exists", async () => {
      const active = sampleVisit({ startedAt: testDate, endedAt: null });
      mockVisitRepo.findOne!.mockResolvedValue(active);

      const result = await service.activeVisit(100);

      expect(result).toBeDefined();
      expect(result!.startedAt).toBeDefined();
      expect(result!.endedAt).toBeNull();
    });

    it("should return null when no active visit", async () => {
      mockVisitRepo.findOne!.mockResolvedValue(null);

      const result = await service.activeVisit(100);

      expect(result).toBeNull();
    });
  });
});
