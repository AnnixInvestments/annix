import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PaystackConfigService } from "../config/paystack.config";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackInitializeTransactionInput {
  email: string;
  amountMinor: number;
  currency: string;
  reference?: string;
  callbackUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackDisableSubscriptionInput {
  subscriptionCode: string;
  emailToken: string;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable()
export class PaystackApiService {
  private readonly logger = new Logger(PaystackApiService.name);

  constructor(private readonly paystackConfig: PaystackConfigService) {}

  private async request<T>(
    path: string,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const secretKey = this.paystackConfig.secretKey();
    if (!secretKey) {
      throw new ServiceUnavailableException(
        "Billing is not configured — set PAYSTACK_SECRET_KEY to enable subscriptions",
      );
    }

    const method = options?.method ?? "GET";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = { method, headers };
    if (options?.body) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, fetchOptions);
    const text = await response.text();
    const parsed = this.parseEnvelope<T>(text);

    if (!response.ok || !parsed || parsed.status !== true) {
      const detail = parsed?.message ?? text;
      this.logger.error(`Paystack API ${method} ${path} ${response.status}: ${detail}`);
      throw new BadRequestException(`Payment provider error: ${detail}`);
    }

    return parsed.data;
  }

  private parseEnvelope<T>(text: string): PaystackEnvelope<T> | null {
    try {
      return JSON.parse(text) as PaystackEnvelope<T>;
    } catch {
      return null;
    }
  }

  async initializeTransaction(
    input: PaystackInitializeTransactionInput,
  ): Promise<PaystackInitializeTransactionResult> {
    const data = await this.request<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>("/transaction/initialize", {
      method: "POST",
      body: {
        email: input.email,
        amount: input.amountMinor,
        currency: input.currency,
        ...(input.reference ? { reference: input.reference } : {}),
        ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
    return {
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference: data.reference,
    };
  }

  async disableSubscription(input: PaystackDisableSubscriptionInput): Promise<void> {
    await this.request<unknown>("/subscription/disable", {
      method: "POST",
      body: { code: input.subscriptionCode, token: input.emailToken },
    });
  }
}
