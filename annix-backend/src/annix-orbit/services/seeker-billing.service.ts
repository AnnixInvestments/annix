import { isMatchTier, type MatchTier } from "@annix/product-data/sa-market";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { isNumber } from "es-toolkit/compat";
import { fromISO, now } from "../../lib/datetime";
import { UserRepository } from "../../user/user.repository";
import { PaystackConfigService } from "../config/paystack.config";
import type { SeekerBillingEventType } from "../entities/seeker-billing-event.entity";
import { isOrbitBillingStatus, type OrbitBillingStatus } from "../lib/seeker-entitlement";
import {
  AnnixOrbitProfileRepository,
  type SeekerBillingUpdate,
} from "../repositories/annix-orbit-profile.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import { SeekerBillingEventRepository } from "../repositories/seeker-billing-event.repository";
import { OrbitBillingSettingsService } from "./orbit-billing-settings.service";
import { PaystackApiService } from "./paystack-api.service";

const PAYABLE_TIERS = ["medium", "hard"] as const;
const CURRENCY = "ZAR";

export interface SeekerCheckoutResult {
  authorizationUrl: string;
  reference: string;
}

export interface SeekerSubscriptionView {
  paystackSubscriptionCode: string | null;
  planTier: string | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
}

export interface SeekerBillingStatusView {
  tier: string;
  billingStatus: OrbitBillingStatus;
  enforced: boolean;
  paidUntil: Date | null;
  subscription: SeekerSubscriptionView | null;
}

interface PaystackWebhookEvent {
  event: string;
  id?: string | number;
  data?: {
    id?: string | number;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    next_payment_date?: string;
    subscription_code?: string;
    email_token?: string;
    customer?: { customer_code?: string; email?: string };
    authorization?: { authorization_code?: string };
    metadata?: { userId?: string | number; tier?: string };
    plan?: { name?: string };
  };
}

function isPayableTier(tier: string): tier is MatchTier {
  return (PAYABLE_TIERS as readonly string[]).includes(tier);
}

const REDACTED_EVENT_DATA_FIELDS = [
  "reference",
  "amount",
  "currency",
  "status",
  "subscription_code",
  "customer_code",
  "plan",
  "paid_at",
  "next_payment_date",
] as const;

function redactPaystackEvent(event: PaystackWebhookEvent): Record<string, unknown> {
  const source = (event.data ?? {}) as Record<string, unknown>;
  const data = REDACTED_EVENT_DATA_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
    if (source[field] !== undefined) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
  const customerCode = event.data?.customer?.customer_code;
  if (customerCode != null) {
    data.customer_code = customerCode;
  }
  return { event: event.event, data };
}

@Injectable()
export class SeekerBillingService {
  private readonly logger = new Logger(SeekerBillingService.name);

  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly tierCapabilityRepo: OrbitTierCapabilityRepository,
    private readonly billingEventRepo: SeekerBillingEventRepository,
    private readonly paystackApi: PaystackApiService,
    private readonly paystackConfig: PaystackConfigService,
    private readonly billingSettings: OrbitBillingSettingsService,
  ) {}

  async startCheckout(userId: number, tier: string): Promise<SeekerCheckoutResult> {
    if (!(await this.billingSettings.enabled("seeker"))) {
      throw new ServiceUnavailableException("Seeker billing is not enabled yet");
    }
    if (!this.paystackConfig.isConfigured()) {
      throw new ServiceUnavailableException("Billing is not configured — please try again later");
    }
    if (!isPayableTier(tier)) {
      throw new BadRequestException("Only paid tiers can be purchased");
    }

    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    const user = await this.userRepo.findById(userId);
    if (!user?.email) {
      throw new BadRequestException("Account email is required to start a subscription");
    }

    const capability = await this.tierCapabilityRepo.findByTier(tier);
    const monthlyPrice = capability?.pricing?.monthlyPrice ?? null;
    if (monthlyPrice == null || monthlyPrice <= 0) {
      throw new BadRequestException("This tier is not available for purchase");
    }

    const init = await this.paystackApi.initializeTransaction({
      email: user.email,
      amountMinor: Math.round(monthlyPrice * 100),
      currency: CURRENCY,
      callbackUrl: this.paystackConfig.callbackUrl(),
      metadata: { userId, tier },
    });

    await this.recordEvent({
      userId,
      type: "checkout_initialized",
      paystackReference: init.reference,
      paystackEventId: null,
      amountMinor: Math.round(monthlyPrice * 100),
      rawPayload: { tier },
    });

    return { authorizationUrl: init.authorizationUrl, reference: init.reference };
  }

  async status(userId: number): Promise<SeekerBillingStatusView> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    const subscription = profile.subscription
      ? {
          paystackSubscriptionCode: profile.subscription.paystackSubscriptionCode ?? null,
          planTier: profile.subscription.planTier ?? null,
          currentPeriodEnd: profile.subscription.currentPeriodEnd ?? null,
          cancelledAt: profile.subscription.cancelledAt ?? null,
        }
      : null;
    return {
      tier: profile.entitledTier,
      billingStatus: isOrbitBillingStatus(profile.billingStatus) ? profile.billingStatus : "none",
      enforced: await this.billingSettings.enabled("seeker"),
      paidUntil: profile.paidUntil,
      subscription,
    };
  }

  async cancel(userId: number): Promise<SeekerBillingStatusView> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    const subscriptionCode = profile.subscription?.paystackSubscriptionCode ?? null;
    const emailToken = profile.subscription?.paystackAuthorizationCode ?? null;
    if (!subscriptionCode || !emailToken) {
      throw new BadRequestException("No active subscription to cancel");
    }

    await this.paystackApi.disableSubscription({ subscriptionCode, emailToken });

    await this.profileRepo.applyBillingUpdate(userId, {
      subscription: { cancelledAt: now().toJSDate() },
    });
    await this.recordEvent({
      userId,
      type: "subscription_cancel_requested",
      paystackReference: null,
      paystackEventId: null,
      amountMinor: null,
      rawPayload: { subscriptionCode },
    });

    return this.status(userId);
  }

  async handleWebhookEvent(event: PaystackWebhookEvent): Promise<void> {
    const eventId = this.eventIdOf(event);
    const userId = this.userIdFrom(event);
    if (userId == null) {
      this.logger.warn(`Paystack ${event.event} event without resolvable userId — ignored`);
      return;
    }

    if (event.event === "charge.success" || event.event === "subscription.create") {
      await this.applyActivation(userId, event, eventId);
      return;
    }
    if (event.event === "invoice.payment_failed") {
      await this.applyPastDue(userId, event, eventId);
      return;
    }
    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      await this.applyLapseAtPeriodEnd(userId, event, eventId);
      return;
    }

    this.logger.log(`Unhandled Paystack event ${event.event}`);
  }

  private async claimEvent(input: {
    userId: number;
    type: SeekerBillingEventType;
    paystackReference: string | null;
    paystackEventId: string | null;
    amountMinor: number | null;
    rawPayload: Record<string, unknown> | null;
  }): Promise<boolean> {
    if (input.paystackEventId == null) {
      await this.recordEvent(input);
      return true;
    }
    const claimed = await this.billingEventRepo.insertIfNew({
      userId: input.userId,
      type: input.type,
      paystackReference: input.paystackReference,
      paystackEventId: input.paystackEventId,
      amountMinor: input.amountMinor,
      currency: CURRENCY,
      rawPayload: input.rawPayload,
    });
    if (!claimed) {
      this.logger.log(`Ignoring replayed Paystack event ${input.paystackEventId}`);
    }
    return claimed;
  }

  private async applyActivation(
    userId: number,
    event: PaystackWebhookEvent,
    eventId: string | null,
  ): Promise<void> {
    const claimed = await this.claimEvent({
      userId,
      type: event.event === "charge.success" ? "charge_success" : "subscription_create",
      paystackReference: event.data?.reference ?? null,
      paystackEventId: eventId,
      amountMinor: this.amountMinorOf(event),
      rawPayload: redactPaystackEvent(event),
    });
    if (!claimed) {
      return;
    }

    const tier = this.tierFrom(event);
    const periodEnd = this.periodEndFrom(event);
    const update: SeekerBillingUpdate = {
      billingStatus: "active",
      paidUntil: periodEnd,
      subscription: {
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        paystackCustomerCode: event.data?.customer?.customer_code ?? null,
        paystackSubscriptionCode: event.data?.subscription_code ?? null,
        paystackAuthorizationCode:
          event.data?.email_token ?? event.data?.authorization?.authorization_code ?? null,
      },
    };
    if (tier) {
      update.entitledTier = tier;
      if (update.subscription) {
        update.subscription.planTier = tier;
      }
    }
    await this.profileRepo.applyBillingUpdate(userId, update);
  }

  private async applyPastDue(
    userId: number,
    event: PaystackWebhookEvent,
    eventId: string | null,
  ): Promise<void> {
    const claimed = await this.claimEvent({
      userId,
      type: "invoice_payment_failed",
      paystackReference: event.data?.reference ?? null,
      paystackEventId: eventId,
      amountMinor: this.amountMinorOf(event),
      rawPayload: redactPaystackEvent(event),
    });
    if (!claimed) {
      return;
    }
    await this.profileRepo.applyBillingUpdate(userId, { billingStatus: "past_due" });
  }

  private async applyLapseAtPeriodEnd(
    userId: number,
    event: PaystackWebhookEvent,
    eventId: string | null,
  ): Promise<void> {
    const claimed = await this.claimEvent({
      userId,
      type:
        event.event === "subscription.disable" ? "subscription_disable" : "subscription_not_renew",
      paystackReference: null,
      paystackEventId: eventId,
      amountMinor: null,
      rawPayload: redactPaystackEvent(event),
    });
    if (!claimed) {
      return;
    }
    await this.profileRepo.applyBillingUpdate(userId, {
      subscription: { cancelledAt: now().toJSDate() },
    });
  }

  private amountMinorOf(event: PaystackWebhookEvent): number | null {
    return isNumber(event.data?.amount) ? event.data.amount : null;
  }

  private eventIdOf(event: PaystackWebhookEvent): string | null {
    const raw = event.id ?? event.data?.id;
    return raw != null ? String(raw) : null;
  }

  private userIdFrom(event: PaystackWebhookEvent): number | null {
    const raw = event.data?.metadata?.userId;
    if (raw == null) {
      return null;
    }
    const parsed = isNumber(raw) ? raw : Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private tierFrom(event: PaystackWebhookEvent): string | null {
    const raw = event.data?.metadata?.tier;
    return raw != null && isPayableTier(String(raw)) && isMatchTier(String(raw))
      ? String(raw)
      : null;
  }

  private periodEndFrom(event: PaystackWebhookEvent): Date {
    const next = event.data?.next_payment_date;
    if (next) {
      const parsed = fromISO(next);
      if (parsed.isValid) {
        return parsed.toJSDate();
      }
    }
    return now().plus({ months: 1 }).toJSDate();
  }

  private async recordEvent(input: {
    userId: number;
    type: SeekerBillingEventType;
    paystackReference: string | null;
    paystackEventId: string | null;
    amountMinor: number | null;
    rawPayload: Record<string, unknown> | null;
  }): Promise<void> {
    await this.billingEventRepo.create({
      userId: input.userId,
      type: input.type,
      paystackReference: input.paystackReference,
      paystackEventId: input.paystackEventId,
      amountMinor: input.amountMinor,
      currency: CURRENCY,
      rawPayload: input.rawPayload,
    });
  }
}
