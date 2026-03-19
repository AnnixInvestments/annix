import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";
import { ActionPermissionService } from "./action-permission.service";

const DEFAULT_NAV_CONFIG: Record<string, string[]> = {
  dashboard: ["viewer", "storeman", "accounts", "manager", "admin"],
  inventory: ["viewer", "storeman", "accounts", "manager", "admin"],
  "job-cards": ["viewer", "storeman", "accounts", "manager", "admin"],
  staff: ["viewer", "storeman", "accounts", "manager", "admin"],
  deliveries: ["viewer", "storeman", "accounts", "manager", "admin"],
  "issue-stock": ["storeman", "manager", "admin"],
  requisitions: ["viewer", "storeman", "accounts", "manager", "admin"],
  "purchase-orders": ["viewer", "storeman", "accounts", "manager", "admin"],
  notifications: ["viewer", "storeman", "accounts", "manager", "admin"],
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
    @InjectRepository(StockControlRbacConfig)
    private readonly rbacRepo: Repository<StockControlRbacConfig>,
    private readonly actionPermissionService: ActionPermissionService,
  ) {}

  async navConfig(companyId: number): Promise<Record<string, string[]>> {
    const rows = await this.rbacRepo.find({ where: { companyId } });

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

    await this.rbacRepo.manager.transaction(async (manager) => {
      await manager.delete(StockControlRbacConfig, { companyId });

      const entities = Object.entries(mergedConfig).flatMap(([navKey, roles]) =>
        roles.map((role) => manager.create(StockControlRbacConfig, { companyId, navKey, role })),
      );

      await manager.save(entities);
    });

    return this.navConfig(companyId);
  }
}
