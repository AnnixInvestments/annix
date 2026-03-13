import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaAuditLog } from "../compliance/entities/audit-log.entity";
import { fromJSDate, now } from "../lib/datetime";
import { ComplySaSubscription } from "./entities/subscription.entity";

const PRICING: Record<string, { monthly: number; name: string; description: string }> = {
  starter: { monthly: 199_00, name: "Starter", description: "Essential compliance tracking" },
  professional: {
    monthly: 499_00,
    name: "Professional",
    description: "Advanced tools + advisor dashboard",
  },
  enterprise: { monthly: 999_00, name: "Enterprise", description: "Full platform + API access" },
};

const FEATURE_MATRIX: Record<string, string[]> = {
  free: ["dashboard"],
  starter: ["dashboard", "requirements", "documents", "notifications", "templates"],
  professional: [
    "dashboard",
    "requirements",
    "documents",
    "notifications",
    "templates",
    "advisor_dashboard",
    "ai_assistant",
    "tender_pack",
  ],
  enterprise: [
    "dashboard",
    "requirements",
    "documents",
    "notifications",
    "templates",
    "advisor_dashboard",
    "ai_assistant",
    "tender_pack",
    "api_access",
    "unlimited_clients",
    "priority_support",
  ],
};

const MAX_REQUIREMENTS: Record<string, number> = {
  free: 5,
  starter: Infinity,
  professional: Infinity,
  enterprise: Infinity,
};

const MAX_CLIENTS: Record<string, number> = {
  free: 0,
  starter: 0,
  professional: 20,
  enterprise: Infinity,
};

@Injectable()
export class ComplySaSubscriptionsService {
  private readonly logger = new Logger(ComplySaSubscriptionsService.name);

  constructor(
    @InjectRepository(ComplySaSubscription)
    private readonly subscriptionRepository: Repository<ComplySaSubscription>,
    @InjectRepository(ComplySaAuditLog)
    private readonly auditLogRepository: Repository<ComplySaAuditLog>,
  ) {}

  async createTrialSubscription(companyId: number): Promise<ComplySaSubscription> {
    const trialEndsAt = now().plus({ days: 14 }).toJSDate();

    const subscription = this.subscriptionRepository.create({
      companyId,
      tier: "starter",
      status: "trial",
      trialEndsAt,
    });

    this.logger.log(`Trial subscription created for company ${companyId}`);

    return this.subscriptionRepository.save(subscription);
  }

  async subscriptionStatus(companyId: number): Promise<{
    subscription: ComplySaSubscription;
    daysRemaining: number | null;
    pricing: typeof PRICING;
    features: string[];
    limits: { maxRequirements: number; maxClients: number };
  }> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId },
    });

    if (subscription === null) {
      throw new NotFoundException("Subscription not found");
    }

    const daysRemaining = (() => {
      if (subscription.status === "trial" && subscription.trialEndsAt !== null) {
        const diff = fromJSDate(subscription.trialEndsAt).diff(now(), "days").days;
        return Math.max(0, Math.ceil(diff));
      } else if (subscription.currentPeriodEnd !== null) {
        const diff = fromJSDate(subscription.currentPeriodEnd).diff(now(), "days").days;
        return Math.max(0, Math.ceil(diff));
      } else {
        return null;
      }
    })();

    const tier = subscription.tier;

    return {
      subscription,
      daysRemaining,
      pricing: PRICING,
      features: FEATURE_MATRIX[tier] ?? FEATURE_MATRIX["free"],
      limits: {
        maxRequirements: MAX_REQUIREMENTS[tier] ?? MAX_REQUIREMENTS["free"],
        maxClients: MAX_CLIENTS[tier] ?? MAX_CLIENTS["free"],
      },
    };
  }

  async upgradeTier(companyId: number, tier: string): Promise<ComplySaSubscription> {
    if (PRICING[tier] == null) {
      throw new ForbiddenException(`Invalid tier: ${tier}`);
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId },
    });

    if (subscription === null) {
      throw new NotFoundException("Subscription not found");
    }

    const previousTier = subscription.tier;
    subscription.tier = tier;
    subscription.status = "active";
    subscription.currentPeriodStart = now().toJSDate();
    subscription.currentPeriodEnd = now().plus({ months: 1 }).toJSDate();

    const saved = await this.subscriptionRepository.save(subscription);

    await this.logAudit(companyId, "subscription_upgrade", {
      previousTier,
      newTier: tier,
    });

    this.logger.log(`Company ${companyId} upgraded from ${previousTier} to ${tier}`);

    return saved;
  }

  async cancelSubscription(companyId: number): Promise<ComplySaSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId },
    });

    if (subscription === null) {
      throw new NotFoundException("Subscription not found");
    }

    const previousStatus = subscription.status;
    subscription.status = "cancelled";
    subscription.cancelledAt = now().toJSDate();

    const saved = await this.subscriptionRepository.save(subscription);

    await this.logAudit(companyId, "subscription_cancel", {
      previousStatus,
      tier: subscription.tier,
    });

    this.logger.log(`Company ${companyId} cancelled subscription (was ${subscription.tier})`);

    return saved;
  }

  async handleWebhook(
    event: string,
    data: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const paystackCustomerId = data["customer_code"] as string | null;

    if (event === "charge.success" && paystackCustomerId !== null) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { paystackCustomerId },
      });

      if (subscription !== null) {
        subscription.status = "active";
        subscription.currentPeriodStart = now().toJSDate();
        subscription.currentPeriodEnd = now().plus({ months: 1 }).toJSDate();
        await this.subscriptionRepository.save(subscription);

        await this.logAudit(subscription.companyId, "webhook_charge_success", {
          paystackCustomerId,
        });

        this.logger.log(`Webhook charge.success for customer ${paystackCustomerId}`);
      }
    } else if (event === "subscription.disable" && paystackCustomerId !== null) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { paystackCustomerId },
      });

      if (subscription !== null) {
        subscription.status = "cancelled";
        subscription.cancelledAt = now().toJSDate();
        await this.subscriptionRepository.save(subscription);

        await this.logAudit(subscription.companyId, "webhook_subscription_disable", {
          paystackCustomerId,
        });

        this.logger.log(`Webhook subscription.disable for customer ${paystackCustomerId}`);
      }
    }

    return { received: true };
  }

  async isFeatureAllowed(companyId: number, feature: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId },
    });

    if (subscription === null) {
      const freeFeatures = FEATURE_MATRIX["free"];
      return freeFeatures.includes(feature);
    }

    const features = FEATURE_MATRIX[subscription.tier] ?? FEATURE_MATRIX["free"];
    return features.includes(feature);
  }

  private async logAudit(
    companyId: number,
    action: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        companyId,
        action,
        entityType: "subscription",
        details,
      });
      await this.auditLogRepository.save(entry);
    } catch (error) {
      this.logger.error(
        `Failed to log audit entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
