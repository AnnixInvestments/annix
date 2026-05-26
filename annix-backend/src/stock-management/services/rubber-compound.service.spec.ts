import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { RubberCompoundRepository } from "../repositories/rubber-compound.repository";
import { RubberCompoundService } from "./rubber-compound.service";
import { StockManagementNotificationsService } from "./stock-management-notifications.service";

describe("RubberCompoundService", () => {
  let service: RubberCompoundService;

  const mockCompoundRepo = {
    findForCompany: jest.fn(),
    findOneForCompany: jest.fn(),
    findOneByCode: jest.fn(),
    findAllForCompany: jest.fn(),
    updateById: jest.fn().mockResolvedValue(undefined),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveMany: jest
      .fn()
      .mockImplementation((entities) =>
        Promise.resolve(entities.map((e: object, i: number) => ({ id: i + 1, ...e }))),
      ),
  };

  const mockNotifications = {
    notifyMissingDatasheet: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberCompoundService,
        { provide: RubberCompoundRepository, useValue: mockCompoundRepo },
        { provide: StockManagementNotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<RubberCompoundService>(RubberCompoundService);
    jest.clearAllMocks();
    mockCompoundRepo.build.mockImplementation((data) => ({ ...data }));
    mockCompoundRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockCompoundRepo.saveMany.mockImplementation((entities) =>
      Promise.resolve(entities.map((e: object, i: number) => ({ id: i + 1, ...e }))),
    );
    mockNotifications.notifyMissingDatasheet.mockResolvedValue(undefined);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a new compound when code is unique", async () => {
      mockCompoundRepo.findOneByCode.mockResolvedValueOnce(null);

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
      mockCompoundRepo.findOneByCode.mockResolvedValueOnce({ id: 1, code: "SBR70" });

      await expect(service.create(1, { code: "SBR70", name: "SBR 70" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("byId", () => {
    it("throws NotFoundException when compound does not exist", async () => {
      mockCompoundRepo.findOneForCompany.mockResolvedValueOnce(null);
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
      mockCompoundRepo.findAllForCompany.mockResolvedValueOnce([]);
      const created = await service.ensureSeedCompoundsForCompany(1);
      expect(created).toBeGreaterThan(0);
    });
  });
});
