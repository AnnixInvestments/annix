import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { nowMillis } from "../../lib/datetime";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";

export const DEFAULT_ACTION_PERMISSIONS: Record<string, string[]> = {
  "job-cards.create": ["manager", "admin"],
  "job-cards.update": ["manager", "admin"],
  "job-cards.delete": ["manager", "admin"],
  "job-cards.import": ["manager", "admin"],
  "job-cards.print": ["manager", "admin"],
  "job-cards.attachments": ["manager", "admin"],
  "job-cards.amendment": ["manager", "admin"],
  "job-cards.allocations": ["manager", "admin"],
  "invoices.approve": ["manager", "admin"],
  "invoices.delete": ["manager", "admin"],
  "invoices.sage-export": ["manager", "admin"],
  "inventory.create": ["manager", "admin"],
  "inventory.delete": ["manager", "admin"],
  "qc.measurements": ["manager", "admin"],
  "certificates.upload": ["manager", "admin"],
  "certificates.delete": ["manager", "admin"],
  "positector.upload-import": ["manager", "admin"],
  "positector.manage-devices": ["manager", "admin"],
  "positector.streaming": ["manager", "admin"],
  "staff.manage": ["manager", "admin"],
  "reports.view": ["manager", "admin"],
  "stock.adjustment": ["manager", "admin"],
  "deliveries.delete": ["manager", "admin"],
  "issuance.issue": ["storeman", "receiving-clerk", "accounts", "manager", "admin"],
  "issuance.undo": ["storeman", "receiving-clerk", "accounts", "manager", "admin"],
};

export const ACTION_PERMISSION_LABELS: Record<string, { group: string; label: string }> = {
  "job-cards.create": { group: "Job Cards", label: "Create job cards" },
  "job-cards.update": { group: "Job Cards", label: "Edit job cards" },
  "job-cards.delete": { group: "Job Cards", label: "Delete job cards" },
  "job-cards.import": { group: "Job Cards", label: "Import job cards from file" },
  "job-cards.print": { group: "Job Cards", label: "Print job cards" },
  "job-cards.attachments": { group: "Job Cards", label: "Upload/delete attachments" },
  "job-cards.amendment": { group: "Job Cards", label: "Upload amendments" },
  "job-cards.allocations": { group: "Job Cards", label: "Approve/reject allocations" },
  "invoices.approve": { group: "Invoices", label: "Approve invoices" },
  "invoices.delete": { group: "Invoices", label: "Delete invoices" },
  "invoices.sage-export": { group: "Invoices", label: "Sage export" },
  "inventory.create": { group: "Inventory", label: "Create inventory items" },
  "inventory.delete": { group: "Inventory", label: "Delete inventory items" },
  "qc.measurements": { group: "Quality Control", label: "Manage QC measurements" },
  "certificates.upload": { group: "Certificates", label: "Upload certificates" },
  "certificates.delete": { group: "Certificates", label: "Delete certificates" },
  "positector.upload-import": { group: "PosiTector", label: "Upload/import batch files" },
  "positector.manage-devices": { group: "PosiTector", label: "Manage devices" },
  "positector.streaming": { group: "PosiTector", label: "Live streaming sessions" },
  "staff.manage": { group: "Staff", label: "Manage staff members" },
  "reports.view": { group: "Reports", label: "View reports" },
  "stock.adjustment": { group: "Stock", label: "Create stock adjustments" },
  "deliveries.delete": { group: "Deliveries", label: "Delete deliveries" },
  "issuance.issue": { group: "Issuance", label: "Issue stock" },
  "issuance.undo": { group: "Issuance", label: "Undo issuance" },
};

const IMMUTABLE_ACTIONS: string[] = [];

@Injectable()
export class ActionPermissionService {
  private readonly logger = new Logger(ActionPermissionService.name);
  private cache = new Map<number, { data: Record<string, string[]>; expiresAt: number }>();

  constructor(
    @InjectRepository(StockControlActionPermission)
    private readonly repo: Repository<StockControlActionPermission>,
  ) {}

  async permissionsForCompany(companyId: number): Promise<Record<string, string[]>> {
    const cached = this.cache.get(companyId);
    if (cached && cached.expiresAt > nowMillis()) {
      return cached.data;
    }

    const rows = await this.repo.find({ where: { companyId } });

    if (rows.length === 0) {
      const defaults = { ...DEFAULT_ACTION_PERMISSIONS };
      this.cache.set(companyId, { data: defaults, expiresAt: nowMillis() + 60_000 });
      return defaults;
    }

    const groupedByAction = rows.reduce(
      (acc, row) => ({
        ...acc,
        [row.actionKey]: [...(acc[row.actionKey] ?? []), row.role],
      }),
      {} as Record<string, string[]>,
    );

    const config = Object.keys(DEFAULT_ACTION_PERMISSIONS).reduce(
      (acc, key) => ({
        ...acc,
        [key]: groupedByAction[key] ?? [...DEFAULT_ACTION_PERMISSIONS[key]],
      }),
      { ...groupedByAction },
    );

    this.cache.set(companyId, { data: config, expiresAt: nowMillis() + 60_000 });
    return config;
  }

  async rolesForAction(companyId: number, actionKey: string): Promise<string[] | null> {
    const config = await this.permissionsForCompany(companyId);
    return config[actionKey] ?? null;
  }

  async updatePermissions(
    companyId: number,
    config: Record<string, string[]>,
  ): Promise<Record<string, string[]>> {
    const mergedConfig = { ...config };

    IMMUTABLE_ACTIONS.forEach((key) => {
      mergedConfig[key] = [...DEFAULT_ACTION_PERMISSIONS[key]];
    });

    Object.keys(mergedConfig).forEach((key) => {
      if (!mergedConfig[key].includes("admin")) {
        mergedConfig[key] = [...mergedConfig[key], "admin"];
      }
    });

    await this.repo.manager.transaction(async (manager) => {
      await manager.delete(StockControlActionPermission, { companyId });

      const entities = Object.entries(mergedConfig).flatMap(([actionKey, roles]) =>
        roles.map((role) =>
          manager.create(StockControlActionPermission, { companyId, actionKey, role }),
        ),
      );

      await manager.save(entities);
    });

    this.cache.delete(companyId);
    this.logger.log(`Updated action permissions for company ${companyId}`);
    return this.permissionsForCompany(companyId);
  }

  actionLabels(): Record<string, { group: string; label: string }> {
    return { ...ACTION_PERMISSION_LABELS };
  }
}
