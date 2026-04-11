import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CompanyModuleLicense } from "../entities/company-module-license.entity";
import { StockManagementLicenseService } from "./stock-management-license.service";

describe("StockManagementLicenseService", () => {
  let service: StockManagementLicenseService;

  const mockLicenseRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockManagementLicenseService,
        { provide: getRepositoryToken(CompanyModuleLicense), useValue: mockLicenseRepo },
      ],
    }).compile();

    service = module.get<StockManagementLicenseService>(StockManagementLicenseService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("ensureLicense", () => {
    it("returns existing license when one exists", async () => {
      const existing = {
        id: 1,
        companyId: 42,
        moduleKey: "stock-management",
        tier: "premium",
        featureOverrides: {},
        active: true,
      };
      mockLicenseRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.ensureLicense(42);

      expect(result).toEqual(existing);
      expect(mockLicenseRepo.findOne).toHaveBeenCalledWith({
        where: { companyId: 42, moduleKey: "stock-management" },
      });
      expect(mockLicenseRepo.save).not.toHaveBeenCalled();
    });

    it("creates a new basic-tier license when none exists", async () => {
      mockLicenseRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.ensureLicense(99);

      expect(mockLicenseRepo.create).toHaveBeenCalledWith({
        companyId: 99,
        moduleKey: "stock-management",
        tier: "basic",
        featureOverrides: {},
        active: true,
      });
      expect(mockLicenseRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ companyId: 99, tier: "basic" });
    });
  });

  describe("isFeatureEnabled", () => {
    it("returns false when license is inactive", async () => {
      mockLicenseRepo.findOne.mockResolvedValueOnce({
        id: 1,
        companyId: 1,
        moduleKey: "stock-management",
        tier: "enterprise",
        featureOverrides: {},
        active: false,
      });

      expect(await service.isFeatureEnabled(1, "STOCK_TAKE")).toBe(false);
    });

    it("respects per-feature overrides over the tier default", async () => {
      mockLicenseRepo.findOne.mockResolvedValueOnce({
        id: 1,
        companyId: 1,
        moduleKey: "stock-management",
        tier: "basic",
        featureOverrides: { STOCK_TAKE: true },
        active: true,
      });

      expect(await service.isFeatureEnabled(1, "STOCK_TAKE")).toBe(true);
    });

    it("falls through to the tier default when no override is present", async () => {
      mockLicenseRepo.findOne.mockResolvedValueOnce({
        id: 1,
        companyId: 1,
        moduleKey: "stock-management",
        tier: "premium",
        featureOverrides: {},
        active: true,
      });

      expect(await service.isFeatureEnabled(1, "FIFO_BATCH_TRACKING")).toBe(true);
      mockLicenseRepo.findOne.mockResolvedValueOnce({
        id: 1,
        companyId: 1,
        moduleKey: "stock-management",
        tier: "premium",
        featureOverrides: {},
        active: true,
      });
      expect(await service.isFeatureEnabled(1, "STOCK_TAKE")).toBe(false);
    });
  });
});
