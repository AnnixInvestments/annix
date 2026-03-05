import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";

const DEFAULT_NAV_CONFIG: Record<string, string[]> = {
  dashboard: ["viewer", "storeman", "accounts", "manager", "admin"],
  inventory: ["viewer", "storeman", "accounts", "manager", "admin"],
  "job-cards": ["viewer", "storeman", "accounts", "manager", "admin"],
  staff: ["viewer", "storeman", "accounts", "manager", "admin"],
  deliveries: ["viewer", "storeman", "accounts", "manager", "admin"],
  "issue-stock": ["storeman", "manager", "admin"],
  requisitions: ["viewer", "storeman", "accounts", "manager", "admin"],
  notifications: ["viewer", "storeman", "accounts", "manager", "admin"],
  reports: ["manager", "admin"],
  settings: ["admin"],
};

const IMMUTABLE_NAV_KEYS = ["settings"];

@Injectable()
export class RbacConfigService {
  constructor(
    @InjectRepository(StockControlRbacConfig)
    private readonly rbacRepo: Repository<StockControlRbacConfig>,
  ) {}

  async navConfig(companyId: number): Promise<Record<string, string[]>> {
    const rows = await this.rbacRepo.find({ where: { companyId } });

    if (rows.length === 0) {
      return { ...DEFAULT_NAV_CONFIG };
    }

    const config: Record<string, string[]> = {};

    rows.forEach((row) => {
      if (!config[row.navKey]) {
        config[row.navKey] = [];
      }
      config[row.navKey].push(row.role);
    });

    Object.keys(DEFAULT_NAV_CONFIG).forEach((key) => {
      if (!config[key]) {
        config[key] = [...DEFAULT_NAV_CONFIG[key]];
      }
    });

    IMMUTABLE_NAV_KEYS.forEach((key) => {
      config[key] = [...DEFAULT_NAV_CONFIG[key]];
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
