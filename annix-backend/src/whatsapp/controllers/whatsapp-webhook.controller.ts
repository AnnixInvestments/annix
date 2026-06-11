import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { fromMillis, now } from "../../lib/datetime";
import { WhatsAppCloudApiService } from "../services/whatsapp-cloud-api.service";
import { WhatsAppConversationService } from "../services/whatsapp-conversation.service";

interface WebhookContact {
  wa_id?: string;
  profile?: { name?: string };
}

interface WebhookMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}

interface WebhookStatus {
  id?: string;
  status?: string;
  errors?: Array<{ title?: string; message?: string }>;
}

interface WebhookChangeValue {
  messaging_product?: string;
  contacts?: WebhookContact[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
}

interface WebhookBody {
  object?: string;
  entry?: Array<{ changes?: Array<{ field?: string; value?: WebhookChangeValue }> }>;
}

function messageBody(message: WebhookMessage): string {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  const interactive = message.interactive;
  if (interactive?.button_reply?.title) return interactive.button_reply.title;
  if (interactive?.list_reply?.title) return interactive.list_reply.title;
  const type = message.type ?? "message";
  return `[${type} message]`;
}

function messageSentAt(message: WebhookMessage): Date {
  const raw = message.timestamp;
  const seconds = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0) {
    return fromMillis(seconds * 1000).toJSDate();
  }
  return now().toJSDate();
}

@ApiExcludeController()
@Controller("public/whatsapp")
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly cloudApi: WhatsAppCloudApiService,
    private readonly conversations: WhatsAppConversationService,
  ) {}

  @Get("webhook")
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ): string {
    const expected = this.cloudApi.verifyToken();
    if (mode === "subscribe" && expected && token === expected) {
      this.logger.log("WhatsApp webhook verified by Meta.");
      return challenge;
    }
    throw new ForbiddenException("Webhook verification failed");
  }

  @Post("webhook")
  @HttpCode(200)
  async receive(@Body() body: WebhookBody): Promise<{ received: boolean }> {
    if (body.object !== "whatsapp_business_account") {
      return { received: true };
    }

    const changes = (body.entry ?? []).flatMap((entry) => entry.changes ?? []);
    const values = changes
      .filter((change) => change.field === "messages")
      .map((change) => change.value)
      .filter((value): value is WebhookChangeValue => value != null);

    await Promise.all(
      values.map(async (value) => {
        const contactNames = new Map<string, string>(
          (value.contacts ?? [])
            .filter((contact) => contact.wa_id && contact.profile?.name)
            .map((contact) => [contact.wa_id as string, contact.profile?.name as string]),
        );

        await Promise.all(
          (value.messages ?? []).map(async (message) => {
            const from = message.from;
            if (!from) return;
            try {
              await this.conversations.recordInbound({
                waId: from,
                profileName: contactNames.get(from) ?? null,
                body: messageBody(message),
                messageType: message.type ?? "text",
                waMessageId: message.id ?? null,
                sentAt: messageSentAt(message),
              });
            } catch (error) {
              this.logger.error(
                `Failed to record inbound WhatsApp message from ${from}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }),
        );

        await Promise.all(
          (value.statuses ?? []).map(async (status) => {
            if (!status.id || !status.status) return;
            const errorDetail =
              status.errors && status.errors.length > 0
                ? (status.errors[0].message ?? status.errors[0].title ?? null)
                : null;
            try {
              await this.conversations.updateMessageStatus(status.id, status.status, errorDetail);
            } catch (error) {
              this.logger.warn(
                `Failed to update WhatsApp message status ${status.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }),
        );
      }),
    );

    return { received: true };
  }
}
