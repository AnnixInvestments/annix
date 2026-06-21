import { Injectable, Logger } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { nowMillis } from "../../lib/datetime";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";

export const DEFAULT_ACTION_PERMISSIONS: Record<string, string[]> = {
  "job-cards.create": ["manager", "admin"],
  "job-cards.update": ["manager", "admin"],
  "job-cards.delete": ["manager", "admin"],
  "job-cards.import": ["manager", "admin"],
  "job-cards.print": ["receiving-clerk", "manager", "admin"],
  "job-cards.attachments": ["accounts", "manager", "admin"],
  "job-cards.amendment": ["manager", "admin"],
  "job-cards.allocations": ["manager", "admin"],
  "invoices.approve": ["accounts", "manager", "admin"],
  "invoices.delete": ["manager", "admin"],
  "invoices.price-adjust": ["accounts", "manager", "admin"],
  "invoices.sage-export": ["manager", "admin"],
  "inventory.create": ["manager", "admin"],
  "inventory.delete": ["accounts", "manager", "admin"],
  "qc.measurements": ["quality", "manager", "admin"],
  "certificates.upload": ["accounts", "quality", "storeman", "manager", "admin"],
  "certificates.delete": ["quality", "manager", "admin"],
  "positector.upload-import": ["quality", "manager", "admin"],
  "positector.manage-devices": ["quality", "manager", "admin"],
  "positector.streaming": ["quality", "manager", "admin"],
  "staff.manage": ["manager", "admin"],
  "reports.view": ["manager", "admin"],
  "stock.adjustment": ["manager", "admin"],
  "deliveries.delete": ["manager", "admin"],
  "issuance.issue": ["storeman", "receiving-clerk", "accounts", "manager", "admin"],
  "issuance.undo": ["storeman", "receiving-clerk", "accounts", "manager", "admin"],
  "job-cards.line-items.manage": ["accounts", "admin"],
};

export const ACTION_PERMISSION_LABELS: Record<string, { group: string; label: string }> = {
  "job-cards.create": { group: "Job Cards", label: "Create job cards" },
  "job-cards.update": { group: "Job Cards", label: "Edit job cards" },
  "job-cards.delete": { group: "Job Cards", label: "Delete job cards" },
  "job-cards.import": { group: "Job Cards", label: "Import job cards from file" },
  "job-cards.print": { group: "Customer", label: "Print job cards" },
  "job-cards.attachments": { group: "Job Cards", label: "Upload/delete attachments" },
  "job-cards.amendment": { group: "Job Cards", label: "Upload amendments" },
  "job-cards.allocations": { group: "Job Cards", label: "Approve/reject allocations" },
  "invoices.approve": { group: "Suppliers", label: "Approve supplier invoices" },
  "invoices.delete": { group: "Invoices", label: "Delete invoices" },
  "invoices.price-adjust": { group: "Suppliers", label: "Price adjust" },
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
  "job-cards.line-items.manage": { group: "Job Cards", label: "Add/delete line items" },
};

const IMMUTABLE_ACTIONS: string[] = [];

@Injectable()
export class ActionPermissionService {
  private readonly logger = new Logger(ActionPermissionService.name);
  private cache = new Map<number, { data: Record<string, string[]>; expiresAt: number }>();

  constructor(
    private readonly repo: StockControlActionPermissionRepository,
    private readonly auditService: AuditService,
  ) {}

  async permissionsForCompany(companyId: number): Promise<Record<string, string[]>> {
    const cached = this.cache.get(companyId);
    if (cached && cached.expiresAt > nowMillis()) {
      return cached.data;
    }

    const rows = await this.repo.findForCompany(companyId);

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
    userId?: number,
  ): Promise<Record<string, string[]>> {
    const previousConfig = await this.permissionsForCompany(companyId);

    const mergedConfig = { ...config };

    IMMUTABLE_ACTIONS.forEach((key) => {
      mergedConfig[key] = [...DEFAULT_ACTION_PERMISSIONS[key]];
    });

    Object.keys(mergedConfig).forEach((key) => {
      if (!mergedConfig[key].includes("admin")) {
        mergedConfig[key] = [...mergedConfig[key], "admin"];
      }
    });

    const existingRows = await this.repo.findManyWhere({ companyId });
    await Promise.all(existingRows.map((row) => this.repo.remove(row)));

    const newRows = Object.entries(mergedConfig).flatMap(([actionKey, roles]) =>
      roles.map((role) => ({ companyId, actionKey, role })),
    );
    await Promise.all(newRows.map((row) => this.repo.create(row)));

    this.cache.delete(companyId);
    this.logger.log(`Updated action permissions for company ${companyId}`);

    const updated = await this.permissionsForCompany(companyId);

    this.auditService
      .log({
        entityType: "stock_control_action_permission",
        entityId: companyId,
        action: AuditAction.UPDATE,
        oldValues: { companyId, permissions: previousConfig },
        newValues: {
          companyId,
          userId: userId ?? null,
          permissions: updated,
          changedActions: this.changedActionKeys(previousConfig, updated),
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    return updated;
  }

  private changedActionKeys(
    previous: Record<string, string[]>,
    next: Record<string, string[]>,
  ): string[] {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    return Array.from(keys).filter((key) => {
      const before = [...(previous[key] ?? [])].sort();
      const after = [...(next[key] ?? [])].sort();
      return before.join(",") !== after.join(",");
    });
  }

  actionLabels(): Record<string, { group: string; label: string }> {
    return { ...ACTION_PERMISSION_LABELS };
  }
}
