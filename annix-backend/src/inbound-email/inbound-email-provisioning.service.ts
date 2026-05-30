import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email/email.service";
import { CompanyService } from "../platform/company.service";
import { InboundEmailService } from "./inbound-email.service";

const INBOX_APP_CODES = ["au-rubber", "stock-control", "annix-orbit"] as const;

interface ProvisionedMailbox {
  app: string;
  emailUser: string;
  plainPassword: string;
}

export interface ProvisionResult {
  provisioned: { app: string; emailUser: string }[];
}

@Injectable()
export class InboundEmailProvisioningService {
  private readonly logger = new Logger(InboundEmailProvisioningService.name);

  constructor(
    private readonly inboundEmailService: InboundEmailService,
    private readonly companyService: CompanyService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async provisionForCompany(input: {
    companyId: number;
    legalName: string | null;
    customerCode: string | null;
  }): Promise<ProvisionResult> {
    const apps = await this.inboxAppsFor(input.companyId);

    if (apps.length === 0) {
      this.logger.log(
        `Company ${input.companyId} has no inbox-driven app subscriptions; skipping mailbox provisioning`,
      );
      return { provisioned: [] };
    }

    const host = this.configService.get<string>("INBOUND_PROVISION_HOST") ?? null;
    const domain = this.configService.get<string>("INBOUND_PROVISION_DOMAIN") ?? null;

    if (!host || !domain) {
      this.logger.warn(
        "INBOUND_PROVISION_HOST / INBOUND_PROVISION_DOMAIN not configured; skipping mailbox provisioning",
      );
      return { provisioned: [] };
    }

    const port = Number(this.configService.get<string>("INBOUND_PROVISION_PORT") ?? "993");
    const tlsEnabled =
      (this.configService.get<string>("INBOUND_PROVISION_TLS") ?? "true") !== "false";

    const slug = this.slugFor(input.legalName, input.customerCode, input.companyId);
    const allConfigs = await this.inboundEmailService.allConfigs();
    const companyApps = new Set(
      allConfigs
        .filter((config) => config.companyId === input.companyId)
        .map((config) => config.app),
    );
    const taken = new Set(allConfigs.map((config) => config.emailUser.toLowerCase()));

    let ordinal = companyApps.size;
    const created: ProvisionedMailbox[] = [];

    for (const app of apps) {
      if (companyApps.has(app)) continue;

      const localPart = this.localPartFor(slug, ordinal, input.companyId, taken, domain);
      const emailUser = `${localPart}@${domain}`;
      taken.add(emailUser.toLowerCase());
      const plainPassword = this.password();

      await this.inboundEmailService.updateEmailConfig(app, input.companyId, {
        emailHost: host,
        emailPort: port,
        emailUser,
        emailPass: plainPassword,
        tlsEnabled,
        tlsServerName: null,
        enabled: false,
      });

      created.push({ app, emailUser, plainPassword });
      ordinal += 1;
    }

    if (created.length === 0) {
      this.logger.log(
        `Company ${input.companyId} already has inbound configs for all subscribed apps; skipping`,
      );
      return { provisioned: [] };
    }

    const companyName = input.legalName ?? `Company #${input.companyId}`;

    try {
      await this.emailService.sendInboundMailboxProvisionedNotification({
        companyId: input.companyId,
        companyName,
        mailboxes: created,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Provisioned ${created.length} mailbox(es) for company ${input.companyId} but failed to send notification: ${message}`,
      );
    }

    this.logger.log(
      `Provisioned ${created.length} inbound mailbox(es) for company ${input.companyId}: ${created
        .map((mailbox) => `${mailbox.app}=${mailbox.emailUser}`)
        .join(", ")}`,
    );

    return {
      provisioned: created.map((mailbox) => ({ app: mailbox.app, emailUser: mailbox.emailUser })),
    };
  }

  private async inboxAppsFor(companyId: number): Promise<string[]> {
    const active = await this.companyService.activeModules(companyId);
    return INBOX_APP_CODES.filter((code) => active.includes(code));
  }

  private localPartFor(
    slug: string,
    ordinal: number,
    companyId: number,
    taken: Set<string>,
    domain: string,
  ): string {
    const base = ordinal === 0 ? `${slug}-app` : `${slug}-${ordinal + 1}-app`;
    if (!taken.has(`${base}@${domain}`.toLowerCase())) return base;

    return ordinal === 0 ? `${slug}-${companyId}-app` : `${slug}-${companyId}-${ordinal + 1}-app`;
  }

  private slugFor(
    legalName: string | null,
    customerCode: string | null,
    companyId: number,
  ): string {
    const fromCode = customerCode ? this.kebabCase(customerCode) : "";
    if (fromCode) return fromCode;

    const fromName = legalName ? this.kebabCase(legalName) : "";
    if (fromName) return fromName;

    return `company-${companyId}`;
  }

  private password(): string {
    return randomBytes(12).toString("base64url").slice(0, 16);
  }

  private kebabCase(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
