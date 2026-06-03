import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { nowISO } from "../lib/datetime";
import type { MarketingCookieConsent } from "./schemas/marketing-cookie-consent.schema";

export interface CookieConsentRecord {
  consentId: string;
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

@Injectable()
export class CookieConsentService {
  private readonly logger = new Logger(CookieConsentService.name);

  constructor(
    @Optional()
    @InjectModel("MarketingCookieConsent")
    private readonly model: Model<MarketingCookieConsent> | null,
  ) {}

  async record(input: CookieConsentRecord, userAgent: string): Promise<void> {
    if (!this.model) {
      return;
    }
    try {
      await this.model.create({
        consentId: input.consentId,
        necessary: input.necessary === true,
        functional: input.functional === true,
        analytics: input.analytics === true,
        marketing: input.marketing === true,
        userAgent,
        createdAt: nowISO(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Could not record cookie consent: ${message}`);
    }
  }
}
