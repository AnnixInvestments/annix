import { Logger } from "@nestjs/common";
import { fromJSDate, now } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import {
  type CrmAdapterConfig,
  type CrmFieldMapping,
  type CrmMeetingData,
  type CrmSyncResult,
  type ICrmAdapter,
  meetingToCrmMeeting,
  prospectToCrmContact,
} from "./crm-adapter.interface";

export interface CsvExportOptions {
  includeHeaders: boolean;
  delimiter: string;
  dateFormat: "iso" | "locale" | "short";
  nullValue: string;
}

const DEFAULT_CSV_OPTIONS: CsvExportOptions = {
  includeHeaders: true,
  delimiter: ",",
  dateFormat: "iso",
  nullValue: "",
};

export class CsvExportAdapter implements ICrmAdapter {
  private readonly logger = new Logger(CsvExportAdapter.name);
  private config: CrmAdapterConfig | null = null;
  private options: CsvExportOptions = DEFAULT_CSV_OPTIONS;

  private contactRows: string[][] = [];
  private meetingRows: string[][] = [];

  readonly type = "csv";

  get name(): string {
    return this.config?.name ?? "CSV Export";
  }

  configure(config: CrmAdapterConfig): void {
    if (config.type !== "csv") {
      throw new Error("Invalid config type for CsvExportAdapter");
    }
    this.config = config;
  }

  setOptions(options: Partial<CsvExportOptions>): void {
    this.options = { ...DEFAULT_CSV_OPTIONS, ...options };
  }

  clearData(): void {
    this.contactRows = [];
    this.meetingRows = [];
  }

  async syncContact(prospect: Prospect): Promise<CrmSyncResult> {
    const contactData = prospectToCrmContact(prospect);
    const mappedData = this.applyFieldMappings(contactData as unknown as Record<string, unknown>);
    const row = this.objectToRow(mappedData);
    this.contactRows = [...this.contactRows, row];

    return {
      success: true,
      timestamp: now().toJSDate(),
    };
  }

  async syncMeeting(
    meeting: Meeting,
    prospect: Prospect,
    summary?: CrmMeetingData["summary"] | null,
  ): Promise<CrmSyncResult> {
    const meetingData = meetingToCrmMeeting(meeting, summary ?? null);
    const enrichedData = {
      ...meetingData,
      prospectCompanyName: prospect.companyName,
      prospectContactName: prospect.contactName,
      prospectEmail: prospect.contactEmail,
    };
    const mappedData = this.applyFieldMappings(enrichedData as unknown as Record<string, unknown>);
    const row = this.objectToRow(mappedData);
    this.meetingRows = [...this.meetingRows, row];

    return {
      success: true,
      timestamp: now().toJSDate(),
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: "CSV export is always available" };
  }

  exportContactsCsv(): string {
    return this.generateCsv(this.contactRows, this.contactHeaders());
  }

  exportMeetingsCsv(): string {
    return this.generateCsv(this.meetingRows, this.meetingHeaders());
  }

  exportProspects(prospects: Prospect[]): string {
    const rows = prospects.map((prospect) => {
      const contactData = prospectToCrmContact(prospect);
      const mappedData = this.applyFieldMappings(contactData as unknown as Record<string, unknown>);
      return this.objectToRow(mappedData);
    });

    return this.generateCsv(rows, this.contactHeaders());
  }

  exportMeetings(
    meetings: Array<{
      meeting: Meeting;
      prospect: Prospect;
      summary?: CrmMeetingData["summary"] | null;
    }>,
  ): string {
    const rows = meetings.map(({ meeting, prospect, summary }) => {
      const meetingData = meetingToCrmMeeting(meeting, summary ?? null);
      const enrichedData = {
        ...meetingData,
        prospectCompanyName: prospect.companyName,
        prospectContactName: prospect.contactName,
        prospectEmail: prospect.contactEmail,
      };
      const mappedData = this.applyFieldMappings(
        enrichedData as unknown as Record<string, unknown>,
      );
      return this.objectToRow(mappedData);
    });

    return this.generateCsv(rows, this.meetingHeaders());
  }

  private contactHeaders(): string[] {
    const mappings = this.config?.fieldMappings ?? [];
    if (mappings.length > 0) {
      return mappings.map((m) => m.targetField);
    }
    return [
      "externalId",
      "companyName",
      "contactName",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "postalCode",
      "country",
      "notes",
      "status",
      "source",
      "industry",
    ];
  }

  private meetingHeaders(): string[] {
    const mappings = this.config?.fieldMappings ?? [];
    if (mappings.length > 0) {
      return mappings.map((m) => m.targetField);
    }
    return [
      "externalId",
      "title",
      "scheduledAt",
      "endedAt",
      "location",
      "notes",
      "outcome",
      "prospectCompanyName",
      "prospectContactName",
      "prospectEmail",
      "summaryOverview",
      "keyPoints",
      "actionItems",
      "nextSteps",
    ];
  }

  private generateCsv(rows: string[][], headers: string[]): string {
    const headerLines = this.options.includeHeaders
      ? [headers.map((h) => this.escapeValue(h)).join(this.options.delimiter)]
      : [];

    const dataLines = rows.map((row) =>
      row.map((v) => this.escapeValue(v)).join(this.options.delimiter),
    );

    return [...headerLines, ...dataLines].join("\n");
  }

  private escapeValue(value: string): string {
    if (value.includes(this.options.delimiter) || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private objectToRow(data: Record<string, unknown>): string[] {
    const headers = this.config?.fieldMappings?.map((m) => m.targetField) ?? Object.keys(data);

    return headers.map((header) => {
      const value = data[header];
      return this.formatValue(value);
    });
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return this.options.nullValue;
    }

    if (value instanceof Date) {
      return this.formatDateValue(value);
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.formatValue(v)).join("; ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatDateValue(date: Date): string {
    const dt = fromJSDate(date);
    switch (this.options.dateFormat) {
      case "locale":
        return dt.toLocaleString({ dateStyle: "short" });
      case "short":
        return dt.toISODate() ?? "";
      default:
        return dt.toISO() ?? "";
    }
  }

  private applyFieldMappings(data: Record<string, unknown>): Record<string, unknown> {
    const mappings = this.config?.fieldMappings ?? [];

    if (mappings.length === 0) {
      return this.flattenObject(data);
    }

    return mappings.reduce(
      (acc, mapping) => {
        const sourceValue = this.resolveNestedField(data, mapping.sourceField);
        const transformedValue =
          sourceValue !== undefined ? this.applyTransform(sourceValue, mapping.transform) : null;
        return { ...acc, [mapping.targetField]: transformedValue };
      },
      {} as Record<string, unknown>,
    );
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (result, [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          return {
            ...result,
            ...this.flattenObject(value as Record<string, unknown>, newKey),
          };
        }

        return { ...result, [newKey]: value };
      },
      {} as Record<string, unknown>,
    );
  }

  private resolveNestedField(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((acc: unknown, part) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
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
