import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RubberCompound } from "../entities/rubber-compound.entity";
import { RubberCompoundService } from "./rubber-compound.service";
import { StockManagementNotificationsService } from "./stock-management-notifications.service";

describe("RubberCompoundService", () => {
  let service: RubberCompoundService;

  const mockCompoundRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => {
      if (Array.isArray(entity)) {
        return Promise.resolve(entity.map((e, i) => ({ id: i + 1, ...e })));
      }
      return Promise.resolve({ id: 1, ...entity });
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockNotifications = {
    notifyMissingDatasheet: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberCompoundService,
        { provide: getRepositoryToken(RubberCompound), useValue: mockCompoundRepo },
        { provide: StockManagementNotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<RubberCompoundService>(RubberCompoundService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a new compound when code is unique", async () => {
      mockCompoundRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.create(1, {
        code: "SBR70",
        name: "SBR 70 Shore A",
        compoundFamily: "SBR",
        densityKgPerM3: 940,
      });

      expect(result).toMatchObject({ companyId: 1, code: "SBR70" });
      expect(mockCompoundRepo.save).toHaveBeenCalled();
    });

    it("throws ConflictException when code already exists", async () => {
      mockCompoundRepo.findOne.mockResolvedValueOnce({ id: 1, code: "SBR70" });

      await expect(service.create(1, { code: "SBR70", name: "SBR 70" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("byId", () => {
    it("throws NotFoundException when compound does not exist", async () => {
      mockCompoundRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("fallbackDensityForFamily", () => {
    it("returns sensible defaults for known compound families", () => {
      expect(service.fallbackDensityForFamily("NR")).toBe(920);
      expect(service.fallbackDensityForFamily("SBR")).toBe(940);
      expect(service.fallbackDensityForFamily("NBR")).toBe(1000);
      expect(service.fallbackDensityForFamily("EPDM")).toBe(860);
      expect(service.fallbackDensityForFamily("FKM")).toBe(1800);
    });

    it("returns a generic default for unknown compound families", () => {
      expect(service.fallbackDensityForFamily("other")).toBe(1000);
    });
  });

  describe("ensureSeedCompoundsForCompany", () => {
    it("seeds standard compounds when none exist", async () => {
      mockCompoundRepo.find.mockResolvedValueOnce([]);
      const created = await service.ensureSeedCompoundsForCompany(1);
      expect(created).toBeGreaterThan(0);
    });
  });
});
