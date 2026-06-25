import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { PaystackConfigService } from "../config/paystack.config";
import { PaystackWebhookThrottlerGuard } from "../guards/paystack-webhook-throttler.guard";
import { verifyPaystackSignature } from "../lib/paystack-signature";
import { SeekerBillingService } from "../services/seeker-billing.service";

const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

@ApiExcludeController()
@Controller("public/webhooks/paystack")
@UseGuards(PaystackWebhookThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly billingService: SeekerBillingService,
    private readonly paystackConfig: PaystackConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody ?? null;

    if (rawBody && rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
      this.logger.warn(
        `Rejected oversized Paystack webhook body (${rawBody.length} bytes) before signature check`,
      );
      return { received: true };
    }

    const secretKey = this.paystackConfig.secretKey();

    if (!verifyPaystackSignature(rawBody, signature, secretKey)) {
      this.logger.warn("Rejected Paystack webhook with invalid signature");
      return { received: true };
    }

    try {
      const event = JSON.parse((rawBody as Buffer).toString("utf8"));
      await this.billingService.handleWebhookEvent(event);
    } catch (error) {
      this.logger.error(
        `Failed to process Paystack webhook: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return { received: true };
  }
}
