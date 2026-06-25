import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isEmpty } from "es-toolkit/compat";

const GRAPH_VERSION = "v21.0";
const RE_ENGAGEMENT_ERROR_CODE = 131047;

export interface CloudApiSendResult {
  waMessageId: string | null;
}

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_data?: { details?: string };
  };
}

/**
 * Thin client for Meta's WhatsApp Business Cloud API. The platform's single
 * global number lives on Meta's servers — no phone or WhatsApp app anywhere.
 * Configured per-environment via Fly secrets; unconfigured environments
 * (local dev, test, staging) report isConfigured() === false and never send.
 */
@Injectable()
export class WhatsAppCloudApiService {
  private readonly logger = new Logger(WhatsAppCloudApiService.name);
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly webhookVerifyToken: string | null;
  private readonly webhookAppSecret: string | null;
  private readonly broadcastTemplate: string;
  private readonly broadcastTemplateLang: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>("WHATSAPP_ACCESS_TOKEN") ?? null;
    this.phoneNumberId = this.configService.get<string>("WHATSAPP_PHONE_NUMBER_ID") ?? null;
    this.webhookVerifyToken =
      this.configService.get<string>("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? null;
    this.webhookAppSecret = this.configService.get<string>("WHATSAPP_APP_SECRET") ?? null;
    const templateName = this.configService.get<string>("WHATSAPP_BROADCAST_TEMPLATE_NAME");
    const templateLang = this.configService.get<string>("WHATSAPP_BROADCAST_TEMPLATE_LANGUAGE");
    this.broadcastTemplate = isEmpty(templateName) ? "broadcast_update" : (templateName as string);
    this.broadcastTemplateLang = isEmpty(templateLang) ? "en" : (templateLang as string);
  }

  isConfigured(): boolean {
    return this.accessToken !== null && this.phoneNumberId !== null;
  }

  verifyToken(): string | null {
    return this.webhookVerifyToken;
  }

  appSecret(): string | null {
    return this.webhookAppSecret;
  }

  configuredPhoneNumberId(): string | null {
    return this.phoneNumberId;
  }

  broadcastTemplateName(): string {
    return this.broadcastTemplate;
  }

  broadcastTemplateLanguage(): string {
    return this.broadcastTemplateLang;
  }

  async sendText(toWaId: string, body: string): Promise<CloudApiSendResult> {
    if (!this.isConfigured()) {
      throw new Error("WhatsApp is not configured in this environment.");
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toWaId,
        type: "text",
        text: { preview_url: false, body },
      }),
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as GraphErrorBody;
      const graphError = detail.error;
      const code = graphError ? graphError.code : null;
      const message = graphError?.message ?? `HTTP ${response.status}`;
      this.logger.error(`WhatsApp send to ${toWaId} failed: ${message} (code ${code})`);
      if (code === RE_ENGAGEMENT_ERROR_CODE) {
        throw new Error(
          "This person hasn't messaged the business in the last 24 hours, so WhatsApp only allows an approved template message — free-form replies are blocked until they message again.",
        );
      }
      throw new Error(`WhatsApp could not deliver the message: ${message}`);
    }

    const payload = (await response.json()) as { messages?: Array<{ id?: string }> };
    const first = payload.messages?.[0];
    return { waMessageId: first?.id ?? null };
  }

  async sendTemplate(
    toWaId: string,
    templateName: string,
    languageCode: string,
    bodyParams: string[],
  ): Promise<CloudApiSendResult> {
    if (!this.isConfigured()) {
      throw new Error("WhatsApp is not configured in this environment.");
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toWaId,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as GraphErrorBody;
      const graphError = detail.error;
      const code = graphError ? graphError.code : null;
      const message = graphError?.message ?? `HTTP ${response.status}`;
      this.logger.error(`WhatsApp template send to ${toWaId} failed: ${message} (code ${code})`);
      throw new Error(`WhatsApp could not deliver the template message: ${message}`);
    }

    const payload = (await response.json()) as { messages?: Array<{ id?: string }> };
    const first = payload.messages?.[0];
    return { waMessageId: first?.id ?? null };
  }
}
