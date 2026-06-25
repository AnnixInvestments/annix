import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import type { UserRepository } from "../../user/user.repository";
import type { PaystackConfigService } from "../config/paystack.config";
import type { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import type { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import type { SeekerBillingEventRepository } from "../repositories/seeker-billing-event.repository";
import type { PaystackApiService } from "./paystack-api.service";
import { SeekerBillingService } from "./seeker-billing.service";

const USER_ID = 42;

function makeService() {
  const profileRepo = {
    findByUserId: jest.fn(),
    applyBillingUpdate: jest.fn(),
  } as unknown as jest.Mocked<AnnixOrbitProfileRepository>;
  const userRepo = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const tierCapabilityRepo = {
    findByTier: jest.fn(),
  } as unknown as jest.Mocked<OrbitTierCapabilityRepository>;
  const billingEventRepo = {
    existsByPaystackEventId: jest.fn().mockResolvedValue(false),
    insertIfNew: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
  } as unknown as jest.Mocked<SeekerBillingEventRepository>;
  const paystackApi = {
    initializeTransaction: jest.fn(),
    disableSubscription: jest.fn(),
  } as unknown as jest.Mocked<PaystackApiService>;
  const paystackConfig = {
    isConfigured: jest.fn().mockReturnValue(true),
    secretKey: jest.fn().mockReturnValue("sk_test"),
    callbackUrl: jest.fn().mockReturnValue(null),
  } as unknown as jest.Mocked<PaystackConfigService>;

  const service = new SeekerBillingService(
    profileRepo,
    userRepo,
    tierCapabilityRepo,
    billingEventRepo,
    paystackApi,
    paystackConfig,
  );
  return {
    service,
    profileRepo,
    userRepo,
    tierCapabilityRepo,
    billingEventRepo,
    paystackApi,
    paystackConfig,
  };
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: USER_ID,
    entitledTier: "soft",
    billingStatus: "none",
    paidUntil: null,
    subscription: null,
    ...overrides,
  } as never;
}

describe("SeekerBillingService.startCheckout", () => {
  it("rejects the free soft tier", async () => {
    const { service } = makeService();
    await expect(service.startCheckout(USER_ID, "soft")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects an unknown tier", async () => {
    const { service } = makeService();
    await expect(service.startCheckout(USER_ID, "platinum")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("fails cleanly when billing is not configured", async () => {
    const { service, paystackConfig } = makeService();
    (paystackConfig.isConfigured as jest.Mock).mockReturnValue(false);
    await expect(service.startCheckout(USER_ID, "medium")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("initializes a Paystack transaction priced from the tier capability in minor units", async () => {
    const { service, profileRepo, userRepo, tierCapabilityRepo, paystackApi } = makeService();
    profileRepo.findByUserId.mockResolvedValue(profile());
    userRepo.findById.mockResolvedValue({ id: USER_ID, email: "seeker@example.com" } as never);
    tierCapabilityRepo.findByTier.mockResolvedValue({
      pricing: { monthlyPrice: 99, perNixRun: null, perCvBuild: null },
    } as never);
    (paystackApi.initializeTransaction as jest.Mock).mockResolvedValue({
      authorizationUrl: "https://paystack/redirect",
      accessCode: "ac",
      reference: "ref_1",
    });

    const result = await service.startCheckout(USER_ID, "medium");

    expect(paystackApi.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "seeker@example.com",
        amountMinor: 9900,
        currency: "ZAR",
        metadata: { userId: USER_ID, tier: "medium" },
      }),
    );
    expect(result).toEqual({ authorizationUrl: "https://paystack/redirect", reference: "ref_1" });
  });
});

describe("SeekerBillingService.handleWebhookEvent", () => {
  it("activates the entitlement on charge.success and writes paidUntil from next_payment_date", async () => {
    const { service, profileRepo } = makeService();
    await service.handleWebhookEvent({
      event: "charge.success",
      id: "evt_1",
      data: {
        reference: "ref_x",
        amount: 9900,
        next_payment_date: "2026-07-25T00:00:00.000Z",
        subscription_code: "SUB_1",
        customer: { customer_code: "CUS_1" },
        email_token: "tok_1",
        metadata: { userId: USER_ID, tier: "medium" },
      },
    });

    expect(profileRepo.applyBillingUpdate).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        entitledTier: "medium",
        billingStatus: "active",
        paidUntil: expect.any(Date),
        subscription: expect.objectContaining({
          planTier: "medium",
          paystackSubscriptionCode: "SUB_1",
          paystackCustomerCode: "CUS_1",
        }),
      }),
    );
  });

  it("maps subscription.create to an active entitlement", async () => {
    const { service, profileRepo } = makeService();
    await service.handleWebhookEvent({
      event: "subscription.create",
      id: "evt_sc",
      data: {
        subscription_code: "SUB_2",
        metadata: { userId: USER_ID, tier: "hard" },
      },
    });
    expect(profileRepo.applyBillingUpdate).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ entitledTier: "hard", billingStatus: "active" }),
    );
  });

  it("marks past_due on invoice.payment_failed without touching paidUntil", async () => {
    const { service, profileRepo } = makeService();
    await service.handleWebhookEvent({
      event: "invoice.payment_failed",
      id: "evt_2",
      data: { metadata: { userId: USER_ID } },
    });
    expect(profileRepo.applyBillingUpdate).toHaveBeenCalledWith(USER_ID, {
      billingStatus: "past_due",
    });
  });

  it("leaves paidUntil intact and only marks cancellation on subscription.disable", async () => {
    const { service, profileRepo } = makeService();
    await service.handleWebhookEvent({
      event: "subscription.disable",
      id: "evt_3",
      data: { metadata: { userId: USER_ID } },
    });
    const [, update] = (profileRepo.applyBillingUpdate as jest.Mock).mock.calls[0];
    expect(update).not.toHaveProperty("paidUntil");
    expect(update.subscription).toEqual(expect.objectContaining({ cancelledAt: expect.any(Date) }));
  });

  it("is idempotent — a claim rejected by the unique index does not re-apply the entitlement", async () => {
    const { service, profileRepo, billingEventRepo } = makeService();
    (billingEventRepo.insertIfNew as jest.Mock).mockResolvedValue(false);
    await service.handleWebhookEvent({
      event: "charge.success",
      id: "evt_dup",
      data: { metadata: { userId: USER_ID, tier: "medium" } },
    });
    expect(profileRepo.applyBillingUpdate).not.toHaveBeenCalled();
  });

  it("claims the event before mutating the entitlement on a fresh event", async () => {
    const { service, profileRepo, billingEventRepo } = makeService();
    await service.handleWebhookEvent({
      event: "charge.success",
      id: "evt_first",
      data: { metadata: { userId: USER_ID, tier: "medium" } },
    });
    expect(billingEventRepo.insertIfNew).toHaveBeenCalledTimes(1);
    expect(profileRepo.applyBillingUpdate).toHaveBeenCalledTimes(1);
    const insertOrder = (billingEventRepo.insertIfNew as jest.Mock).mock.invocationCallOrder[0];
    const applyOrder = (profileRepo.applyBillingUpdate as jest.Mock).mock.invocationCallOrder[0];
    expect(insertOrder).toBeLessThan(applyOrder);
  });

  it("redacts card data and the raw email before persisting the billing event", async () => {
    const { service, billingEventRepo } = makeService();
    await service.handleWebhookEvent({
      event: "charge.success",
      id: "evt_redact",
      data: {
        reference: "ref_r",
        amount: 9900,
        currency: "ZAR",
        status: "success",
        subscription_code: "SUB_R",
        next_payment_date: "2026-07-25T00:00:00.000Z",
        customer: { customer_code: "CUS_R", email: "seeker@example.com" },
        authorization: {
          authorization_code: "AUTH_R",
          last4: "4242",
          exp_month: "08",
          exp_year: "2030",
          card_type: "visa",
          bank: "Test Bank",
        },
        metadata: { userId: USER_ID, tier: "medium" },
      } as never,
    });

    const [claimed] = (billingEventRepo.insertIfNew as jest.Mock).mock.calls[0];
    const serialized = JSON.stringify(claimed.rawPayload);
    expect(serialized).not.toContain("4242");
    expect(serialized).not.toContain("exp_month");
    expect(serialized).not.toContain("authorization");
    expect(serialized).not.toContain("seeker@example.com");
    expect(claimed.rawPayload).toEqual(
      expect.objectContaining({
        event: "charge.success",
        data: expect.objectContaining({
          reference: "ref_r",
          amount: 9900,
          subscription_code: "SUB_R",
          customer_code: "CUS_R",
        }),
      }),
    );
  });

  it("ignores events whose metadata carries no resolvable userId (IDOR guard)", async () => {
    const { service, profileRepo } = makeService();
    await service.handleWebhookEvent({
      event: "charge.success",
      id: "evt_4",
      data: { metadata: {} },
    });
    expect(profileRepo.applyBillingUpdate).not.toHaveBeenCalled();
  });
});
