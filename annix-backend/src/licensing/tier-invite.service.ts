import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email/email.service";
import { now } from "../lib/datetime";
import { TierInvite } from "./entities/tier-invite.entity";
import { LicensingService } from "./licensing.service";
import { LicensingCatalogService } from "./licensing-catalog.service";
import { TierInviteRepository } from "./repositories/tier-invite.repository";

const INVITE_TTL_DAYS = 14;

const APP_NAMES: Record<string, string> = {
  "au-rubber": "AU Rubber",
  "annix-orbit": "Annix Orbit",
  "stock-control": "Stock Control",
  "rfq-platform": "Annix RFQ",
  "annix-sentinel": "Annix Sentinel",
  "annix-rep": "Annix Pulse",
  insights: "Annix Insights",
};

export interface CreateTierInviteInput {
  moduleKey: string;
  email: string;
  tierKey: string;
  freeDays: number;
  invitedById: number | null;
}

@Injectable()
export class TierInviteService {
  private readonly logger = new Logger(TierInviteService.name);

  constructor(
    private readonly inviteRepo: TierInviteRepository,
    private readonly catalogService: LicensingCatalogService,
    private readonly licensingService: LicensingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  listForModule(moduleKey: string): Promise<TierInvite[]> {
    return this.inviteRepo.findByModuleKey(moduleKey);
  }

  async create(input: CreateTierInviteInput): Promise<TierInvite> {
    if (!Number.isFinite(input.freeDays) || input.freeDays <= 0) {
      throw new BadRequestException("Free days must be a positive number.");
    }
    const catalog = await this.catalogService.effectiveCatalog(input.moduleKey);
    const tier = catalog.tiers.find((candidate) => candidate.key === input.tierKey);
    if (!tier) {
      throw new BadRequestException(
        `Tier "${input.tierKey}" is not defined for "${input.moduleKey}".`,
      );
    }

    const email = input.email.trim().toLowerCase();
    const token = randomUUID();
    const expiresAt = now().plus({ days: INVITE_TTL_DAYS }).toJSDate();

    const invite = await this.inviteRepo.create({
      moduleKey: input.moduleKey,
      email,
      tierKey: input.tierKey,
      freeDays: input.freeDays,
      token,
      status: "pending",
      invitedById: input.invitedById,
      acceptedAt: null,
      expiresAt,
    });

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const acceptUrl = `${frontendUrl}/?invite=${token}`;
    const appName = APP_NAMES[input.moduleKey] ?? input.moduleKey;

    await this.emailService.sendTierInviteEmail(
      email,
      appName,
      tier.name,
      input.freeDays,
      acceptUrl,
    );

    this.logger.log(
      `Tier invite created: ${email} -> ${input.moduleKey}/${input.tierKey} (${input.freeDays}d)`,
    );
    return invite;
  }

  async grantForCompany(token: string, companyId: number): Promise<{ granted: boolean }> {
    const invite = await this.inviteRepo.findByToken(token);
    if (!invite) {
      throw new NotFoundException("Invite not found.");
    }
    const validFrom = now().toJSDate();
    const validUntil = now().plus({ days: invite.freeDays }).toJSDate();
    await this.licensingService.setTier(companyId, invite.moduleKey, invite.tierKey);
    await this.licensingService.setValidity(companyId, invite.moduleKey, validFrom, validUntil);

    invite.status = "accepted";
    invite.acceptedAt = now().toJSDate();
    await this.inviteRepo.save(invite);

    this.logger.log(
      `Granted tier invite ${token}: company ${companyId} -> ${invite.moduleKey}/${invite.tierKey}`,
    );
    return { granted: true };
  }
}
