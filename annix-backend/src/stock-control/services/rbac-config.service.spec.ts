import { Test, TestingModule } from "@nestjs/testing";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { StockControlRbacConfigRepository } from "../repositories/stock-control-rbac-config.repository";
import { ActionPermissionService } from "./action-permission.service";
import { RbacConfigService } from "./rbac-config.service";

describe("RbacConfigService", () => {
  let service: RbacConfigService;

  const mockRepo = {
    findForCompany: jest.fn(),
    removeForCompany: jest.fn(),
    create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
  };

  const mockCompanyRepo = {
    findById: jest.fn(),
    updateById: jest.fn().mockResolvedValue(undefined),
  };

  const savedConfig = () => {
    const calls = mockCompanyRepo.updateById.mock.calls;
    const last = calls[calls.length - 1];
    return last ? (last[1].rbacConfig as Record<string, string[]>) : {};
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacConfigService,
        { provide: StockControlRbacConfigRepository, useValue: mockRepo },
        { provide: StockControlCompanyRepository, useValue: mockCompanyRepo },
        {
          provide: ActionPermissionService,
          useValue: { permissionsForCompany: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<RbacConfigService>(RbacConfigService);
    jest.clearAllMocks();
    mockRepo.findForCompany.mockResolvedValue([]);
    mockCompanyRepo.findById.mockResolvedValue(null);
    mockCompanyRepo.updateById.mockImplementation((id: number, updates) => {
      mockCompanyRepo.findById.mockResolvedValue({ id, ...updates });
      return Promise.resolve(undefined);
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("navConfig", () => {
    it("should return hardcoded defaults when no rows exist for company", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      const result = await service.navConfig(1);

      expect(mockRepo.findForCompany).toHaveBeenCalledWith(1);
      expect(result.dashboard).toContain("admin");
      expect(result.dashboard).toContain("viewer");
      expect(result.dashboard).toContain("storeman");
      expect(result.dashboard).toContain("accounts");
      expect(result.dashboard).toContain("manager");
      expect(result.settings).toEqual(["admin"]);
    });

    it("should return stored config when rows exist", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "dashboard", role: "admin" },
        { companyId: 1, navKey: "dashboard", role: "manager" },
        { companyId: 1, navKey: "inventory", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(result.dashboard).toEqual(["admin", "manager"]);
      expect(result.inventory).toEqual(["admin"]);
    });

    it("should fill in defaults for nav keys not present in stored config", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "dashboard", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(result.dashboard).toEqual(["admin"]);
      expect(result.inventory).toContain("viewer");
      expect(result.inventory).toContain("admin");
      expect(result.reports).toContain("manager");
    });

    it("should always enforce settings as admin-only regardless of stored config", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "settings", role: "manager" },
        { companyId: 1, navKey: "settings", role: "admin" },
        { companyId: 1, navKey: "dashboard", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(result.settings).toEqual(["admin"]);
    });

    it("should scope queries by companyId", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      await service.navConfig(42);

      expect(mockRepo.findForCompany).toHaveBeenCalledWith(42);
    });
  });

  describe("updateNavConfig", () => {
    beforeEach(() => {
      mockRepo.findForCompany.mockResolvedValue([]);
    });

    it("should atomically persist the whole map onto the company doc", async () => {
      const config = {
        dashboard: ["viewer", "admin"],
        inventory: ["admin"],
      };

      await service.updateNavConfig(1, config);

      expect(mockCompanyRepo.updateById).toHaveBeenCalledWith(1, {
        rbacConfig: expect.objectContaining({
          dashboard: expect.arrayContaining(["viewer", "admin"]),
          inventory: expect.arrayContaining(["admin"]),
        }),
      });
    });

    it("should not delete-and-recreate per-row documents", async () => {
      await service.updateNavConfig(1, { dashboard: ["admin"] });

      expect(mockRepo.removeForCompany).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("should always include admin role in every nav key", async () => {
      const config = {
        dashboard: ["viewer", "storeman"],
        inventory: ["viewer"],
      };

      await service.updateNavConfig(1, config);

      const saved = savedConfig();

      expect(saved.dashboard).toContain("admin");
      expect(saved.inventory).toContain("admin");
    });

    it("should force settings to admin-only even if other roles are provided", async () => {
      const config = {
        settings: ["viewer", "manager", "admin"],
        dashboard: ["admin"],
      };

      await service.updateNavConfig(1, config);

      expect(savedConfig().settings).toEqual(["admin"]);
    });

    it("should not duplicate admin if already present", async () => {
      const config = {
        dashboard: ["viewer", "admin"],
      };

      await service.updateNavConfig(1, config);

      const dashboardAdmins = savedConfig().dashboard.filter((role) => role === "admin");

      expect(dashboardAdmins).toHaveLength(1);
    });

    it("should return the refreshed config after update", async () => {
      const result = await service.updateNavConfig(1, { dashboard: ["admin"] });

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
    });

    it("should scope the write to the correct companyId", async () => {
      await service.updateNavConfig(99, { dashboard: ["admin"] });

      expect(mockCompanyRepo.updateById).toHaveBeenCalledWith(99, expect.anything());
    });

    it("should persist entities with correct navKey and roles", async () => {
      const config = {
        reports: ["manager", "admin"],
      };

      await service.updateNavConfig(5, config);

      expect(savedConfig().reports).toEqual(expect.arrayContaining(["manager", "admin"]));
    });
  });

  // ── Embedded read with legacy fallback ──────────────────────────────

  describe("navConfig — embedded company field", () => {
    it("should read from the embedded company.rbacConfig when present", async () => {
      mockCompanyRepo.findById.mockResolvedValue({
        id: 1,
        rbacConfig: { dashboard: ["storeman", "admin"] },
      });

      const result = await service.navConfig(1);

      expect(result.dashboard).toEqual(["storeman", "admin"]);
      expect(mockRepo.findForCompany).not.toHaveBeenCalled();
    });

    it("should fall back to legacy collection when embedded field is absent", async () => {
      mockCompanyRepo.findById.mockResolvedValue({ id: 1, rbacConfig: null });
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "dashboard", role: "storeman" },
        { companyId: 1, navKey: "dashboard", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(mockRepo.findForCompany).toHaveBeenCalledWith(1);
      expect(result.dashboard).toEqual(["storeman", "admin"]);
    });

    it("should fall back to defaults when neither embedded nor legacy data exists", async () => {
      mockCompanyRepo.findById.mockResolvedValue({ id: 1, rbacConfig: null });
      mockRepo.findForCompany.mockResolvedValue([]);

      const result = await service.navConfig(1);

      expect(result.settings).toEqual(["admin"]);
      expect(result.dashboard).toContain("viewer");
    });

    it("should merge embedded config with defaults for unconfigured nav keys", async () => {
      mockCompanyRepo.findById.mockResolvedValue({
        id: 1,
        rbacConfig: { dashboard: ["admin"] },
      });

      const result = await service.navConfig(1);

      expect(result.dashboard).toEqual(["admin"]);
      expect(result.inventory).toContain("viewer");
    });
  });

  // ── Viewer role visibility scenarios ────────────────────────────────

  describe("viewer role — nav visibility", () => {
    it("viewer should see dashboard by default", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);
      const result = await service.navConfig(1);
      expect(result.dashboard).toContain("viewer");
    });

    it("viewer should see job-cards by default", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);
      const result = await service.navConfig(1);
      expect(result["job-cards"]).toContain("viewer");
    });

    it("viewer should see deliveries by default", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);
      const result = await service.navConfig(1);
      expect(result.deliveries).toContain("viewer");
    });

    it("viewer should NOT see issue-stock by default", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);
      const result = await service.navConfig(1);
      expect(result["issue-stock"]).not.toContain("viewer");
    });

    it("viewer should NOT see reports by default", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);
      const result = await service.navConfig(1);
      expect(result.reports).not.toContain("viewer");
    });

    it("viewer should NOT see settings even if stored config says so", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "settings", role: "viewer" },
        { companyId: 1, navKey: "settings", role: "admin" },
      ]);

      const result = await service.navConfig(1);
      expect(result.settings).not.toContain("viewer");
      expect(result.settings).toEqual(["admin"]);
    });
  });

  // ── Admin restricts viewer visibility ───────────────────────────────

  describe("admin restricting viewer access", () => {
    it("admin can remove viewer from dashboard", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      await service.updateNavConfig(1, {
        dashboard: ["storeman", "accounts", "manager", "admin"],
      });

      const dashboardRoles = savedConfig().dashboard;

      expect(dashboardRoles).not.toContain("viewer");
      expect(dashboardRoles).toContain("admin");
    });

    it("admin can remove viewer from job-cards", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      await service.updateNavConfig(1, {
        "job-cards": ["manager", "admin"],
      });

      expect(savedConfig()["job-cards"]).not.toContain("viewer");
    });

    it("admin can grant viewer access to reports (non-default)", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      await service.updateNavConfig(1, {
        reports: ["viewer", "manager", "admin"],
      });

      expect(savedConfig().reports).toContain("viewer");
    });

    it("admin can grant viewer access to issue-stock (non-default)", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      await service.updateNavConfig(1, {
        "issue-stock": ["viewer", "storeman", "manager", "admin"],
      });

      expect(savedConfig()["issue-stock"]).toContain("viewer");
    });

    it("stored config with viewer removed from all pages is respected", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "dashboard", role: "admin" },
        { companyId: 1, navKey: "dashboard", role: "manager" },
        { companyId: 1, navKey: "inventory", role: "admin" },
        { companyId: 1, navKey: "inventory", role: "manager" },
        { companyId: 1, navKey: "job-cards", role: "admin" },
        { companyId: 1, navKey: "job-cards", role: "manager" },
      ]);

      const result = await service.navConfig(1);

      expect(result.dashboard).not.toContain("viewer");
      expect(result.inventory).not.toContain("viewer");
      expect(result["job-cards"]).not.toContain("viewer");
    });

    it("stored config with viewer added to restricted pages is respected", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, navKey: "reports", role: "viewer" },
        { companyId: 1, navKey: "reports", role: "manager" },
        { companyId: 1, navKey: "reports", role: "admin" },
        { companyId: 1, navKey: "issue-stock", role: "viewer" },
        { companyId: 1, navKey: "issue-stock", role: "admin" },
      ]);

      const result = await service.navConfig(1);

      expect(result.reports).toContain("viewer");
      expect(result["issue-stock"]).toContain("viewer");
    });
  });

  // ── Multi-company isolation ─────────────────────────────────────────

  describe("multi-company isolation", () => {
    it("company A config should not affect company B", async () => {
      mockRepo.findForCompany.mockImplementation((companyId: number) => {
        if (companyId === 1) {
          return Promise.resolve([{ companyId: 1, navKey: "dashboard", role: "admin" }]);
        }
        return Promise.resolve([
          { companyId: 2, navKey: "dashboard", role: "viewer" },
          { companyId: 2, navKey: "dashboard", role: "admin" },
        ]);
      });

      const configA = await service.navConfig(1);
      const configB = await service.navConfig(2);

      expect(configA.dashboard).not.toContain("viewer");
      expect(configB.dashboard).toContain("viewer");
    });
  });
});
