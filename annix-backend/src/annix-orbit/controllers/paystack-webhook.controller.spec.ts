import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import type { PaystackConfigService } from "../config/paystack.config";
import type { SeekerBillingService } from "../services/seeker-billing.service";
import { PaystackWebhookController } from "./paystack-webhook.controller";

function makeController() {
  const billingService = {
    handleWebhookEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SeekerBillingService>;
  const paystackConfig = {
    secretKey: jest.fn().mockReturnValue("sk_test"),
  } as unknown as jest.Mocked<PaystackConfigService>;
  const controller = new PaystackWebhookController(billingService, paystackConfig);
  return { controller, billingService, paystackConfig };
}

function requestWithBody(body: Buffer): RawBodyRequest<Request> {
  return { rawBody: body } as unknown as RawBodyRequest<Request>;
}

describe("PaystackWebhookController.handle", () => {
  it("acks and rejects an oversized body before computing the HMAC", async () => {
    const { controller, billingService, paystackConfig } = makeController();
    const oversized = Buffer.alloc(256 * 1024 + 1, 0x61);

    const result = await controller.handle(requestWithBody(oversized), "sig");

    expect(result).toEqual({ received: true });
    expect(paystackConfig.secretKey).not.toHaveBeenCalled();
    expect(billingService.handleWebhookEvent).not.toHaveBeenCalled();
  });
});
