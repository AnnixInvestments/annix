import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../../audit/audit.service";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import {
  ACTION_PERMISSION_LABELS,
  ActionPermissionService,
  DEFAULT_ACTION_PERMISSIONS,
} from "./action-permission.service";

describe("ActionPermissionService", () => {
  let service: ActionPermissionService;

  const mockRepo = {
    findForCompany: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
  };

  const mockCompanyRepo = {
    findById: jest.fn(),
    updateById: jest.fn().mockResolvedValue(undefined),
  };

  const savedPermissions = () => {
    const calls = mockCompanyRepo.updateById.mock.calls;
    const last = calls[calls.length - 1];
    return last ? (last[1].actionPermissions as Record<string, string[]>) : {};
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionPermissionService,
        { provide: StockControlActionPermissionRepository, useValue: mockRepo },
        { provide: StockControlCompanyRepository, useValue: mockCompanyRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ActionPermissionService>(ActionPermissionService);
    jest.clearAllMocks();
    mockRepo.findManyWhere.mockResolvedValue([]);
    mockCompanyRepo.findById.mockResolvedValue(null);
    mockCompanyRepo.updateById.mockImplementation((id: number, updates) => {
      mockCompanyRepo.findById.mockResolvedValue({ id, ...updates });
      return Promise.resolve(undefined);
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── Default permissions ─────────────────────────────────────────────

  describe("permissionsForCompany — defaults", () => {
    it("should return defaults when no rows exist for company", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

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
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, actionKey: "job-cards.create", role: "admin" },
        { companyId: 1, actionKey: "job-cards.create", role: "viewer" },
      ]);

      const result = await service.permissionsForCompany(1);

      expect(result["job-cards.create"]).toContain("viewer");
      expect(result["job-cards.create"]).toContain("admin");
    });

    it("should fall back to defaults for actions not in stored config", async () => {
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, actionKey: "job-cards.create", role: "admin" },
      ]);

      const result = await service.permissionsForCompany(1);

      expect(result["job-cards.delete"]).toEqual(DEFAULT_ACTION_PERMISSIONS["job-cards.delete"]);
    });

    it("should scope queries by companyId", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);
      await service.permissionsForCompany(42);
      expect(mockRepo.findForCompany).toHaveBeenCalledWith(42);
    });
  });

  // ── rolesForAction helper ───────────────────────────────────────────

  describe("rolesForAction", () => {
    it("should return roles for a specific action from defaults", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      const roles = await service.rolesForAction(1, "job-cards.create");

      expect(roles).toEqual(["manager", "admin"]);
    });

    it("should return null for an unknown action key", async () => {
      mockRepo.findForCompany.mockResolvedValue([]);

      const roles = await service.rolesForAction(1, "nonexistent.action");

      expect(roles).toBeNull();
    });

    it("should return stored roles when config exists", async () => {
      mockRepo.findForCompany.mockResolvedValue([
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
      mockRepo.findForCompany.mockResolvedValue([]);
    });

    it("should atomically persist the whole map onto the company doc", async () => {
      const config = { "job-cards.create": ["viewer", "admin"] };

      await service.updatePermissions(1, config);

      expect(mockCompanyRepo.updateById).toHaveBeenCalledWith(1, {
        actionPermissions: expect.objectContaining({
          "job-cards.create": expect.arrayContaining(["viewer", "admin"]),
        }),
      });
    });

    it("should not delete-and-recreate per-row documents", async () => {
      await service.updatePermissions(1, { "job-cards.create": ["admin"] });

      expect(mockRepo.remove).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("should always force admin into every action", async () => {
      const config = { "job-cards.create": ["viewer"] };

      await service.updatePermissions(1, config);

      const roles = savedPermissions()["job-cards.create"];

      expect(roles).toContain("admin");
      expect(roles).toContain("viewer");
    });

    it("should not duplicate admin if already present", async () => {
      const config = { "job-cards.create": ["admin"] };

      await service.updatePermissions(1, config);

      const adminEntries = savedPermissions()["job-cards.create"].filter(
        (role) => role === "admin",
      );

      expect(adminEntries).toHaveLength(1);
    });

    it("should scope the write to the correct companyId", async () => {
      await service.updatePermissions(99, { "job-cards.create": ["admin"] });

      expect(mockCompanyRepo.updateById).toHaveBeenCalledWith(99, expect.anything());
    });

    it("should allow granting viewer access to specific actions when admin configures it", async () => {
      const config = {
        "reports.view": ["viewer", "manager", "admin"],
        "job-cards.create": ["manager", "admin"],
      };

      const result = await service.updatePermissions(1, config);

      expect(result["reports.view"]).toContain("viewer");
      expect(result["job-cards.create"]).not.toContain("viewer");
    });
  });

  // ── Embedded read with legacy fallback ──────────────────────────────

  describe("permissionsForCompany — embedded company field", () => {
    it("should read from the embedded company.actionPermissions when present", async () => {
      mockCompanyRepo.findById.mockResolvedValue({
        id: 1,
        actionPermissions: { "job-cards.create": ["storeman", "admin"] },
      });

      const result = await service.permissionsForCompany(1);

      expect(result["job-cards.create"]).toEqual(["storeman", "admin"]);
      expect(mockRepo.findForCompany).not.toHaveBeenCalled();
    });

    it("should fall back to legacy collection when embedded field is absent", async () => {
      mockCompanyRepo.findById.mockResolvedValue({ id: 1, actionPermissions: null });
      mockRepo.findForCompany.mockResolvedValue([
        { companyId: 1, actionKey: "inventory.create", role: "storeman" },
        { companyId: 1, actionKey: "inventory.create", role: "admin" },
      ]);

      const result = await service.permissionsForCompany(1);

      expect(mockRepo.findForCompany).toHaveBeenCalledWith(1);
      expect(result["inventory.create"]).toContain("storeman");
    });

    it("should fall back to defaults when neither embedded nor legacy data exists", async () => {
      mockCompanyRepo.findById.mockResolvedValue({ id: 1, actionPermissions: null });
      mockRepo.findForCompany.mockResolvedValue([]);

      const result = await service.permissionsForCompany(1);

      expect(result).toEqual(DEFAULT_ACTION_PERMISSIONS);
    });

    it("should merge embedded config with defaults for unconfigured actions", async () => {
      mockCompanyRepo.findById.mockResolvedValue({
        id: 1,
        actionPermissions: { "job-cards.create": ["admin"] },
      });

      const result = await service.permissionsForCompany(1);

      expect(result["job-cards.delete"]).toEqual(DEFAULT_ACTION_PERMISSIONS["job-cards.delete"]);
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
