import { Injectable } from "@nestjs/common";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";
import { StockControlRbacConfigRepository } from "../repositories/stock-control-rbac-config.repository";
import { ActionPermissionService } from "./action-permission.service";

const DEFAULT_NAV_CONFIG: Record<string, string[]> = {
  dashboard: ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  inventory: ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  "job-cards": ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  staff: ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  deliveries: ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  "issue-stock": ["storeman", "manager", "admin"],
  requisitions: ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  "purchase-orders": ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  notifications: ["viewer", "quality", "storeman", "accounts", "manager", "admin"],
  reports: ["manager", "admin"],
  settings: ["admin"],
};

const IMMUTABLE_NAV_KEYS = ["settings"];

const NAV_TO_ACTION_KEYS: Record<string, string[]> = {
  "issue-stock": ["issuance.issue", "issuance.undo"],
};

@Injectable()
export class RbacConfigService {
  constructor(
    private readonly rbacRepo: StockControlRbacConfigRepository,
    private readonly actionPermissionService: ActionPermissionService,
    private readonly txRunner: TransactionRunner,
  ) {}

  private transactionManager(context: TransactionContext) {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("RbacConfigService transactions require a TypeOrmTransactionContext");
    }
    return context.manager;
  }

  async navConfig(companyId: number): Promise<Record<string, string[]>> {
    const rows = await this.rbacRepo.findForCompany(companyId);

    const config: Record<string, string[]> =
      rows.length > 0
        ? rows.reduce(
            (acc, row) => {
              const existing = acc[row.navKey] || [];
              return { ...acc, [row.navKey]: [...existing, row.role] };
            },
            {} as Record<string, string[]>,
          )
        : {};

    Object.keys(DEFAULT_NAV_CONFIG).forEach((key) => {
      if (!config[key]) {
        config[key] = [...DEFAULT_NAV_CONFIG[key]];
      }
    });

    IMMUTABLE_NAV_KEYS.forEach((key) => {
      config[key] = [...DEFAULT_NAV_CONFIG[key]];
    });

    const actionPerms = await this.actionPermissionService.permissionsForCompany(companyId);
    Object.entries(NAV_TO_ACTION_KEYS).forEach(([navKey, actionKeys]) => {
      const navRoles = config[navKey] || [];
      const additionalRoles = actionKeys
        .flatMap((ak) => actionPerms[ak] || [])
        .filter((role) => !navRoles.includes(role));

      if (additionalRoles.length > 0) {
        config[navKey] = [...navRoles, ...new Set(additionalRoles)];
      }
    });

    return config;
  }

  async updateNavConfig(
    companyId: number,
    config: Record<string, string[]>,
  ): Promise<Record<string, string[]>> {
    const mergedConfig = { ...config };

    IMMUTABLE_NAV_KEYS.forEach((key) => {
      mergedConfig[key] = [...DEFAULT_NAV_CONFIG[key]];
    });

    Object.keys(mergedConfig).forEach((key) => {
      if (!mergedConfig[key].includes("admin")) {
        mergedConfig[key] = [...mergedConfig[key], "admin"];
      }
    });

    await this.txRunner.run(async (ctx) => {
      const manager = this.transactionManager(ctx);
      await manager.delete(StockControlRbacConfig, { companyId });

      const entities = Object.entries(mergedConfig).flatMap(([navKey, roles]) =>
        roles.map((role) => manager.create(StockControlRbacConfig, { companyId, navKey, role })),
      );

      await manager.save(entities);
    });

    return this.navConfig(companyId);
  }
}
