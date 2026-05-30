import { Injectable } from "@nestjs/common";
import { CompanyRepository } from "../platform/company.repository";
import {
  AdminInboundConfigGroupDto,
  AdminInboundConfigRowDto,
} from "./dto/admin-inbound-email.dto";
import { InboundEmailService } from "./inbound-email.service";

const APP_LABELS: Record<string, string> = {
  "au-rubber": "AU Rubber",
  "stock-control": "Stock Control",
  "annix-orbit": "Annix Orbit",
};

const KNOWN_INBOX_APPS = ["au-rubber", "stock-control", "annix-orbit"];

@Injectable()
export class AdminInboundEmailService {
  constructor(
    private readonly inboundEmailService: InboundEmailService,
    private readonly companyRepo: CompanyRepository,
  ) {}

  async listGroupedByApp(): Promise<AdminInboundConfigGroupDto[]> {
    const configs = await this.inboundEmailService.allConfigs();

    const companyIds = [
      ...new Set(
        configs.map((config) => config.companyId).filter((id): id is number => id !== null),
      ),
    ];

    const companies = companyIds.length > 0 ? await this.companyRepo.findByIds(companyIds) : [];
    const nameById = new Map(
      companies.map((company) => [
        company.id,
        company.tradingName || company.legalName || company.name,
      ]),
    );

    const rows: AdminInboundConfigRowDto[] = configs.map((config) => {
      const companyId = config.companyId;
      const companyName =
        companyId === null
          ? "Shared / product mailbox"
          : (nameById.get(companyId) ?? `Company #${companyId}`);

      return {
        app: config.app,
        companyId,
        companyName,
        emailUser: config.emailUser,
        enabled: config.enabled,
        lastPollAt: config.lastPollAt ? config.lastPollAt.toISOString() : null,
        lastError: config.lastError,
      };
    });

    const extraApps = [...new Set(rows.map((row) => row.app))].filter(
      (app) => !KNOWN_INBOX_APPS.includes(app),
    );

    return [...KNOWN_INBOX_APPS, ...extraApps].map((app) => ({
      app,
      label: APP_LABELS[app] ?? app,
      accounts: rows.filter((row) => row.app === app),
    }));
  }

  async setEnabled(
    app: string,
    companyId: number | null,
    enabled: boolean,
  ): Promise<{ message: string }> {
    return this.inboundEmailService.setEnabled(app, companyId, enabled);
  }
}
