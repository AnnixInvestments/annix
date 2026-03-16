import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";
import { ActionPermissionService } from "./action-permission.service";
import { RbacConfigService } from "./rbac-config.service";

describe("RbacConfigService", () => {
  let service: RbacConfigService;

  const mockManager = {
    delete: jest.fn(),
    create: jest.fn().mockImplementation((_, data) => data),
    save: jest.fn(),
  };

  const mockRepo = {
    find: jest.fn(),
    manager: {
      transaction: jest.fn().mockImplementation((fn) => fn(mockManager)),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacConfigService,
        { provide: getRepositoryToken(StockControlRbacConfig), useValue: mockRepo },
        {
          provide: ActionPermissionService,
          useValue: { permissionsForCompany: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<RbacConfigService>(RbacConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("navConfig", () => {
    it("should return hardcoded defaults when no rows exist for company", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.navConfig(1);

      expect(mockRepo.find).toHaveBeenCalledWith({ where: { companyId: 1 } });
      expect(result.dashboard).toContain("admin");
      expect(result.dashboard).toContain("viewer");
      expect(result.dashboard).toContain("storeman");
      expect(result.dashboard).toContain("accounts");
      expect(result.dashboard).toContain("manager");
      expect(result.settings).toEqual(["admin"]);
    });

    it("should return stored config when rows exist", async () => {
      mockRepo.find.mockResolvedValue([
        { companyId: 1, navKey: "dashboard", role: "admin" },
        { companyId: 1, navKey: "dashboard", role: "manager" },
        { companyId: 1, navKey: "inventory", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(result.dashboard).toEqual(["admin", "manager"]);
      expect(result.inventory).toEqual(["admin"]);
    });

    it("should fill in defaults for nav keys not present in stored config", async () => {
      mockRepo.find.mockResolvedValue([{ companyId: 1, navKey: "dashboard", role: "admin" }]);

      const result = await service.navConfig(1);

      expect(result.dashboard).toEqual(["admin"]);
      expect(result.inventory).toContain("viewer");
      expect(result.inventory).toContain("admin");
      expect(result.reports).toContain("manager");
    });

    it("should always enforce settings as admin-only regardless of stored config", async () => {
      mockRepo.find.mockResolvedValue([
        { companyId: 1, navKey: "settings", role: "manager" },
        { companyId: 1, navKey: "settings", role: "admin" },
        { companyId: 1, navKey: "dashboard", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(result.settings).toEqual(["admin"]);
    });

    it("should scope queries by companyId", async () => {
      mockRepo.find.mockResolvedValue([]);

      await service.navConfig(42);

      expect(mockRepo.find).toHaveBeenCalledWith({ where: { companyId: 42 } });
    });
  });

  describe("updateNavConfig", () => {
    beforeEach(() => {
      mockRepo.find.mockResolvedValue([]);
    });

    it("should delete existing config and insert new rows in a transaction", async () => {
      const config = {
        dashboard: ["viewer", "admin"],
        inventory: ["admin"],
      };

      await service.updateNavConfig(1, config);

      expect(mockManager.delete).toHaveBeenCalledWith(StockControlRbacConfig, { companyId: 1 });
      expect(mockManager.save).toHaveBeenCalled();
    });

    it("should always include admin role in every nav key", async () => {
      const config = {
        dashboard: ["viewer", "storeman"],
        inventory: ["viewer"],
      };

      await service.updateNavConfig(1, config);

      const savedEntities = mockManager.save.mock.calls[0][0];
      const dashboardRoles = savedEntities
        .filter((e: any) => e.navKey === "dashboard")
        .map((e: any) => e.role);
      const inventoryRoles = savedEntities
        .filter((e: any) => e.navKey === "inventory")
        .map((e: any) => e.role);

      expect(dashboardRoles).toContain("admin");
      expect(inventoryRoles).toContain("admin");
    });

    it("should force settings to admin-only even if other roles are provided", async () => {
      const config = {
        settings: ["viewer", "manager", "admin"],
        dashboard: ["admin"],
      };

      await service.updateNavConfig(1, config);

      const savedEntities = mockManager.save.mock.calls[0][0];
      const settingsRoles = savedEntities
        .filter((e: any) => e.navKey === "settings")
        .map((e: any) => e.role);

      expect(settingsRoles).toEqual(["admin"]);
    });

    it("should not duplicate admin if already present", async () => {
      const config = {
        dashboard: ["viewer", "admin"],
      };

      await service.updateNavConfig(1, config);

      const savedEntities = mockManager.save.mock.calls[0][0];
      const dashboardAdmins = savedEntities.filter(
        (e: any) => e.navKey === "dashboard" && e.role === "admin",
      );

      expect(dashboardAdmins).toHaveLength(1);
    });

    it("should return the refreshed config after update", async () => {
      mockRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.updateNavConfig(1, { dashboard: ["admin"] });

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });

    it("should scope delete to the correct companyId", async () => {
      await service.updateNavConfig(99, { dashboard: ["admin"] });

      expect(mockManager.delete).toHaveBeenCalledWith(StockControlRbacConfig, { companyId: 99 });
    });

    it("should create entities with correct companyId, navKey, and role", async () => {
      const config = {
        reports: ["manager", "admin"],
      };

      await service.updateNavConfig(5, config);

      expect(mockManager.create).toHaveBeenCalledWith(StockControlRbacConfig, {
        companyId: 5,
        navKey: "reports",
        role: "manager",
      });
      expect(mockManager.create).toHaveBeenCalledWith(StockControlRbacConfig, {
        companyId: 5,
        navKey: "reports",
        role: "admin",
      });
    });
  });
});
