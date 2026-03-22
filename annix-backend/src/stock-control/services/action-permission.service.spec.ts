import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";
import {
  ACTION_PERMISSION_LABELS,
  ActionPermissionService,
  DEFAULT_ACTION_PERMISSIONS,
} from "./action-permission.service";

describe("ActionPermissionService", () => {
  let service: ActionPermissionService;

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
        ActionPermissionService,
        { provide: getRepositoryToken(StockControlActionPermission), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ActionPermissionService>(ActionPermissionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── Default permissions ─────────────────────────────────────────────

  describe("permissionsForCompany — defaults", () => {
    it("should return defaults when no rows exist for company", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.permissionsForCompany(1);

      expect(result).toEqual(DEFAULT_ACTION_PERMISSIONS);
    });

    it("should NOT include viewer in any default action permission", () => {
      Object.entries(DEFAULT_ACTION_PERMISSIONS).forEach(([actionKey, roles]) => {
        expect(roles).not.toContain("viewer");
      });
    });

    it("should include admin in every default action permission", () => {
      Object.entries(DEFAULT_ACTION_PERMISSIONS).forEach(([actionKey, roles]) => {
        expect(roles).toContain("admin");
      });
    });

    it("should include manager in most default action permissions", () => {
      const managerActions = Object.entries(DEFAULT_ACTION_PERMISSIONS).filter(([, roles]) =>
        roles.includes("manager"),
      );
      expect(managerActions.length).toBeGreaterThan(20);
    });

    it("should restrict job card creation to manager and admin by default", () => {
      expect(DEFAULT_ACTION_PERMISSIONS["job-cards.create"]).toEqual(["manager", "admin"]);
    });

    it("should restrict job card deletion to manager and admin by default", () => {
      expect(DEFAULT_ACTION_PERMISSIONS["job-cards.delete"]).toEqual(["manager", "admin"]);
    });

    it("should restrict inventory creation to manager and admin by default", () => {
      expect(DEFAULT_ACTION_PERMISSIONS["inventory.create"]).toEqual(["manager", "admin"]);
    });

    it("should restrict invoice approval to accounts, manager and admin by default", () => {
      expect(DEFAULT_ACTION_PERMISSIONS["invoices.approve"]).toEqual([
        "accounts",
        "manager",
        "admin",
      ]);
    });

    it("should allow storeman to issue stock by default", () => {
      expect(DEFAULT_ACTION_PERMISSIONS["issuance.issue"]).toContain("storeman");
    });

    it("should NOT allow viewer to issue stock by default", () => {
      expect(DEFAULT_ACTION_PERMISSIONS["issuance.issue"]).not.toContain("viewer");
    });

    it("should have a label entry for every default permission key", () => {
      Object.keys(DEFAULT_ACTION_PERMISSIONS).forEach((key) => {
        expect(ACTION_PERMISSION_LABELS[key]).toBeDefined();
        expect(ACTION_PERMISSION_LABELS[key].group).toBeTruthy();
        expect(ACTION_PERMISSION_LABELS[key].label).toBeTruthy();
      });
    });
  });

  // ── Viewer role is excluded from all destructive actions ────────────

  describe("viewer role exclusions", () => {
    const DESTRUCTIVE_ACTIONS = [
      "job-cards.create",
      "job-cards.update",
      "job-cards.delete",
      "job-cards.import",
      "job-cards.attachments",
      "job-cards.amendment",
      "job-cards.allocations",
      "job-cards.line-items.manage",
      "invoices.approve",
      "invoices.delete",
      "invoices.price-adjust",
      "invoices.sage-export",
      "inventory.create",
      "inventory.delete",
      "qc.measurements",
      "certificates.upload",
      "certificates.delete",
      "positector.upload-import",
      "positector.manage-devices",
      "positector.streaming",
      "staff.manage",
      "stock.adjustment",
      "deliveries.delete",
      "issuance.issue",
      "issuance.undo",
    ];

    DESTRUCTIVE_ACTIONS.forEach((actionKey) => {
      it(`viewer should NOT have default permission for ${actionKey}`, () => {
        expect(DEFAULT_ACTION_PERMISSIONS[actionKey]).not.toContain("viewer");
      });
    });
  });

  // ── Stored config overrides ─────────────────────────────────────────

  describe("permissionsForCompany — stored overrides", () => {
    it("should use stored config when rows exist", async () => {
      mockRepo.find.mockResolvedValue([
        { companyId: 1, actionKey: "job-cards.create", role: "admin" },
        { companyId: 1, actionKey: "job-cards.create", role: "viewer" },
      ]);

      const result = await service.permissionsForCompany(1);

      expect(result["job-cards.create"]).toContain("viewer");
      expect(result["job-cards.create"]).toContain("admin");
    });

    it("should fall back to defaults for actions not in stored config", async () => {
      mockRepo.find.mockResolvedValue([
        { companyId: 1, actionKey: "job-cards.create", role: "admin" },
      ]);

      const result = await service.permissionsForCompany(1);

      expect(result["job-cards.delete"]).toEqual(DEFAULT_ACTION_PERMISSIONS["job-cards.delete"]);
    });

    it("should scope queries by companyId", async () => {
      mockRepo.find.mockResolvedValue([]);
      await service.permissionsForCompany(42);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { companyId: 42 } });
    });
  });

  // ── rolesForAction helper ───────────────────────────────────────────

  describe("rolesForAction", () => {
    it("should return roles for a specific action from defaults", async () => {
      mockRepo.find.mockResolvedValue([]);

      const roles = await service.rolesForAction(1, "job-cards.create");

      expect(roles).toEqual(["manager", "admin"]);
    });

    it("should return null for an unknown action key", async () => {
      mockRepo.find.mockResolvedValue([]);

      const roles = await service.rolesForAction(1, "nonexistent.action");

      expect(roles).toBeNull();
    });

    it("should return stored roles when config exists", async () => {
      mockRepo.find.mockResolvedValue([
        { companyId: 1, actionKey: "inventory.create", role: "storeman" },
        { companyId: 1, actionKey: "inventory.create", role: "admin" },
      ]);

      const roles = await service.rolesForAction(1, "inventory.create");

      expect(roles).toContain("storeman");
      expect(roles).toContain("admin");
    });
  });

  // ── updatePermissions ───────────────────────────────────────────────

  describe("updatePermissions", () => {
    beforeEach(() => {
      mockRepo.find.mockResolvedValue([]);
    });

    it("should delete existing permissions and insert new ones in a transaction", async () => {
      const config = { "job-cards.create": ["viewer", "admin"] };

      await service.updatePermissions(1, config);

      expect(mockManager.delete).toHaveBeenCalledWith(StockControlActionPermission, {
        companyId: 1,
      });
      expect(mockManager.save).toHaveBeenCalled();
    });

    it("should always force admin into every action", async () => {
      const config = { "job-cards.create": ["viewer"] };

      await service.updatePermissions(1, config);

      const savedEntities = mockManager.save.mock.calls[0][0];
      const roles = savedEntities
        .filter((e: any) => e.actionKey === "job-cards.create")
        .map((e: any) => e.role);

      expect(roles).toContain("admin");
      expect(roles).toContain("viewer");
    });

    it("should not duplicate admin if already present", async () => {
      const config = { "job-cards.create": ["admin"] };

      await service.updatePermissions(1, config);

      const savedEntities = mockManager.save.mock.calls[0][0];
      const adminEntries = savedEntities.filter(
        (e: any) => e.actionKey === "job-cards.create" && e.role === "admin",
      );

      expect(adminEntries).toHaveLength(1);
    });

    it("should scope delete to the correct companyId", async () => {
      await service.updatePermissions(99, { "job-cards.create": ["admin"] });

      expect(mockManager.delete).toHaveBeenCalledWith(StockControlActionPermission, {
        companyId: 99,
      });
    });

    it("should allow granting viewer access to specific actions when admin configures it", async () => {
      const config = {
        "reports.view": ["viewer", "manager", "admin"],
        "job-cards.create": ["manager", "admin"],
      };

      await service.updatePermissions(1, config);

      const savedEntities = mockManager.save.mock.calls[0][0];
      const reportsRoles = savedEntities
        .filter((e: any) => e.actionKey === "reports.view")
        .map((e: any) => e.role);
      const jobCardsRoles = savedEntities
        .filter((e: any) => e.actionKey === "job-cards.create")
        .map((e: any) => e.role);

      expect(reportsRoles).toContain("viewer");
      expect(jobCardsRoles).not.toContain("viewer");
    });
  });

  // ── actionLabels ────────────────────────────────────────────────────

  describe("actionLabels", () => {
    it("should return a copy of the labels", () => {
      const labels = service.actionLabels();
      expect(labels).toEqual(ACTION_PERMISSION_LABELS);
      expect(labels).not.toBe(ACTION_PERMISSION_LABELS);
    });

    it("should have groups for all labels", () => {
      const labels = service.actionLabels();
      Object.values(labels).forEach((entry) => {
        expect(entry.group).toBeTruthy();
        expect(entry.label).toBeTruthy();
      });
    });
  });
});
