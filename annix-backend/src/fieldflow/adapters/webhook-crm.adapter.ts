import { Logger } from "@nestjs/common";
import { fromJSDate, now, nowISO } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import {
  type CrmAdapterConfig,
  type CrmContactData,
  type CrmFieldMapping,
  type CrmMeetingData,
  type CrmSyncResult,
  type ICrmAdapter,
  meetingToCrmMeeting,
  prospectToCrmContact,
} from "./crm-adapter.interface";

export class WebhookCrmAdapter implements ICrmAdapter {
  private readonly logger = new Logger(WebhookCrmAdapter.name);
  private config: CrmAdapterConfig | null = null;

  readonly type = "webhook";

  get name(): string {
    return this.config?.name ?? "Webhook CRM";
  }

  configure(config: CrmAdapterConfig): void {
    if (config.type !== "webhook") {
      throw new Error("Invalid config type for WebhookCrmAdapter");
    }
    this.config = config;
  }

  async syncContact(prospect: Prospect): Promise<CrmSyncResult> {
    if (!this.config?.webhookUrl) {
      return {
        success: false,
        error: "Webhook URL not configured",
        timestamp: now().toJSDate(),
      };
    }

    const contactData = prospectToCrmContact(prospect);
    const mappedData = this.applyFieldMappings(contactData, "contact");

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: this.config.webhookMethod ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.webhookHeaders,
        },
        body: JSON.stringify({
          type: "contact",
          action: prospect.crmExternalId ? "update" : "create",
          data: mappedData,
          timestamp: nowISO(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Webhook sync failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          timestamp: now().toJSDate(),
        };
      }

      const result = await response.json().catch(() => ({}));
      return {
        success: true,
        externalId: result.id ?? result.externalId ?? prospect.crmExternalId ?? undefined,
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Webhook sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  async syncMeeting(
    meeting: Meeting,
    prospect: Prospect,
    summary?: CrmMeetingData["summary"] | null,
  ): Promise<CrmSyncResult> {
    if (!this.config?.webhookUrl) {
      return {
        success: false,
        error: "Webhook URL not configured",
        timestamp: now().toJSDate(),
      };
    }

    const meetingData = meetingToCrmMeeting(meeting, summary ?? null);
    const mappedData = this.applyFieldMappings(meetingData, "meeting");

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: this.config.webhookMethod ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.webhookHeaders,
        },
        body: JSON.stringify({
          type: "meeting",
          action: meeting.crmExternalId ? "update" : "create",
          data: mappedData,
          contact: {
            externalId: prospect.crmExternalId,
            companyName: prospect.companyName,
          },
          timestamp: nowISO(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Webhook sync failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          timestamp: now().toJSDate(),
        };
      }

      const result = await response.json().catch(() => ({}));
      return {
        success: true,
        externalId: result.id ?? result.externalId ?? meeting.crmExternalId ?? undefined,
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Webhook sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.webhookUrl) {
      return { success: false, message: "Webhook URL not configured" };
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: this.config.webhookMethod ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.webhookHeaders,
        },
        body: JSON.stringify({
          type: "test",
          action: "ping",
          timestamp: nowISO(),
        }),
      });

      if (response.ok) {
        return { success: true, message: "Connection successful" };
      }

      return {
        success: false,
        message: `HTTP ${response.status}: ${await response.text()}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: errorMessage };
    }
  }

  private applyFieldMappings(
    data: CrmContactData | CrmMeetingData,
    dataType: "contact" | "meeting",
  ): Record<string, unknown> {
    const relevantMappings = this.config?.fieldMappings ?? [];

    const dataAsRecord = data as unknown as Record<string, unknown>;

    if (relevantMappings.length === 0) {
      return dataAsRecord;
    }

    const mapped = relevantMappings.reduce(
      (acc, mapping) => {
        const sourceValue = this.resolveNestedField(dataAsRecord, mapping.sourceField);
        if (sourceValue !== undefined) {
          const transformedValue = this.applyTransform(sourceValue, mapping.transform);
          this.setNestedField(acc, mapping.targetField, transformedValue);
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const unmappedFields = Object.keys(dataAsRecord).filter(
      (key) => !relevantMappings.some((m) => m.sourceField === key),
    );

    return unmappedFields.reduce((acc, field) => {
      if (!(field in acc)) {
        return { ...acc, [field]: dataAsRecord[field] };
      }
      return acc;
    }, mapped);
  }

  private resolveNestedField(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((acc: unknown, part) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  private setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split(".");
    const parentParts = parts.slice(0, -1);

    const current = parentParts.reduce((acc, part) => {
      if (!(part in acc) || typeof acc[part] !== "object") {
        acc[part] = {};
      }
      return acc[part] as Record<string, unknown>;
    }, obj);

    current[parts[parts.length - 1]] = value;
  }

  private applyTransform(value: unknown, transform?: CrmFieldMapping["transform"]): unknown {
    if (!transform || value === null || value === undefined) {
      return value;
    }

    switch (transform) {
      case "uppercase":
        return typeof value === "string" ? value.toUpperCase() : value;
      case "lowercase":
        return typeof value === "string" ? value.toLowerCase() : value;
      case "date":
        return value instanceof Date
          ? (fromJSDate(value).toISODate() ?? "")
          : typeof value === "string"
            ? value.split("T")[0]
            : value;
      case "datetime":
        return value instanceof Date ? (fromJSDate(value).toISO() ?? "") : value;
      case "boolean":
        return Boolean(value);
      case "number":
        return typeof value === "string" ? parseFloat(value) : value;
      default:
        return value;
    }
  }
}
