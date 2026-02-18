import { Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import type { CrmOAuthConfig } from "../providers/crm-oauth-provider.interface";
import type {
  CrmAdapterConfig,
  CrmContactData,
  CrmMeetingData,
  CrmSyncResult,
  ICrmAdapter,
} from "./crm-adapter.interface";

interface SalesforceConfig extends CrmAdapterConfig {
  accessToken: string;
  instanceUrl: string;
}

interface SalesforceRecord {
  Id: string;
  attributes: { type: string; url: string };
  [key: string]: unknown;
}

interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

interface SalesforceContact extends SalesforceRecord {
  FirstName: string | null;
  LastName: string;
  Email: string | null;
  Phone: string | null;
  Title: string | null;
  MailingStreet: string | null;
  MailingCity: string | null;
  MailingState: string | null;
  MailingPostalCode: string | null;
  MailingCountry: string | null;
  Description: string | null;
  Account?: { Name: string } | null;
  AccountId: string | null;
  LastModifiedDate: string;
}

interface SalesforceLead extends SalesforceRecord {
  FirstName: string | null;
  LastName: string;
  Company: string;
  Email: string | null;
  Phone: string | null;
  Title: string | null;
  Street: string | null;
  City: string | null;
  State: string | null;
  PostalCode: string | null;
  Country: string | null;
  Description: string | null;
  Status: string;
  Rating: string | null;
  AnnualRevenue: number | null;
  LastModifiedDate: string;
}

interface SalesforceEvent extends SalesforceRecord {
  Subject: string;
  Description: string | null;
  StartDateTime: string;
  EndDateTime: string;
  Location: string | null;
  WhoId: string | null;
  WhatId: string | null;
  ActivityDate: string | null;
  LastModifiedDate: string;
}

export interface PullContactsResult {
  contacts: CrmContactData[];
  nextSyncToken: string | null;
}

export interface PullMeetingsResult {
  meetings: CrmMeetingData[];
  nextSyncToken: string | null;
}

export class SalesforceAdapter implements ICrmAdapter {
  private readonly logger = new Logger(SalesforceAdapter.name);
  private config: SalesforceConfig | null = null;

  readonly type = "salesforce";

  get name(): string {
    return this.config?.name ?? "Salesforce CRM";
  }

  configure(config: CrmAdapterConfig): void {
    this.config = config as SalesforceConfig;
  }

  configureOAuth(oauthConfig: CrmOAuthConfig, adapterConfig: CrmAdapterConfig): void {
    this.config = {
      ...adapterConfig,
      accessToken: oauthConfig.accessToken,
      instanceUrl: oauthConfig.instanceUrl ?? "",
    };
  }

  private apiUrl(path: string): string {
    return `${this.config?.instanceUrl}/services/data/v58.0${path}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config?.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async syncContact(prospect: Prospect): Promise<CrmSyncResult> {
    if (!this.config?.accessToken || !this.config?.instanceUrl) {
      return {
        success: false,
        error: "Salesforce not configured - missing access token or instance URL",
        timestamp: now().toJSDate(),
      };
    }

    try {
      const isUpdate = Boolean(prospect.crmExternalId);
      const nameParts = this.splitName(prospect.contactName);

      const leadData: Record<string, unknown> = {
        FirstName: nameParts.firstName,
        LastName: nameParts.lastName,
        Company: prospect.companyName,
        Email: prospect.contactEmail,
        Phone: prospect.contactPhone,
        Title: prospect.contactTitle,
        Street: prospect.streetAddress,
        City: prospect.city,
        State: prospect.province,
        PostalCode: prospect.postalCode,
        Country: prospect.country,
        Description: prospect.notes,
        Status: this.mapProspectStatusToSalesforce(prospect.status),
        Rating: this.mapScoreToRating(prospect.score),
        AnnualRevenue: prospect.estimatedValue,
      };

      const cleanedData = this.removeNullValues(leadData);

      if (isUpdate && prospect.crmExternalId) {
        const response = await fetch(this.apiUrl(`/sobjects/Lead/${prospect.crmExternalId}`), {
          method: "PATCH",
          headers: this.headers(),
          body: JSON.stringify(cleanedData),
        });

        if (!response.ok) {
          const error = await response.json();
          this.logger.error(`Salesforce update failed: ${JSON.stringify(error)}`);
          return {
            success: false,
            error: this.extractSalesforceError(error),
            timestamp: now().toJSDate(),
          };
        }

        return {
          success: true,
          externalId: prospect.crmExternalId,
          timestamp: now().toJSDate(),
        };
      }

      const response = await fetch(this.apiUrl("/sobjects/Lead"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`Salesforce create failed: ${JSON.stringify(result)}`);
        return {
          success: false,
          error: this.extractSalesforceError(result),
          timestamp: now().toJSDate(),
        };
      }

      return {
        success: true,
        externalId: result.id,
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Salesforce sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  async syncMeeting(meeting: Meeting, prospect: Prospect): Promise<CrmSyncResult> {
    if (!this.config?.accessToken || !this.config?.instanceUrl) {
      return {
        success: false,
        error: "Salesforce not configured - missing access token or instance URL",
        timestamp: now().toJSDate(),
      };
    }

    try {
      const isUpdate = Boolean(meeting.crmExternalId);

      const eventData: Record<string, unknown> = {
        Subject: meeting.title,
        Description: this.buildMeetingDescription(meeting),
        StartDateTime: meeting.scheduledStart.toISOString(),
        EndDateTime: meeting.scheduledEnd.toISOString(),
        Location: meeting.location,
        WhoId: prospect.crmExternalId,
      };

      const cleanedData = this.removeNullValues(eventData);

      if (isUpdate && meeting.crmExternalId) {
        const response = await fetch(this.apiUrl(`/sobjects/Event/${meeting.crmExternalId}`), {
          method: "PATCH",
          headers: this.headers(),
          body: JSON.stringify(cleanedData),
        });

        if (!response.ok) {
          const error = await response.json();
          this.logger.error(`Salesforce event update failed: ${JSON.stringify(error)}`);
          return {
            success: false,
            error: this.extractSalesforceError(error),
            timestamp: now().toJSDate(),
          };
        }

        return {
          success: true,
          externalId: meeting.crmExternalId,
          timestamp: now().toJSDate(),
        };
      }

      const response = await fetch(this.apiUrl("/sobjects/Event"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`Salesforce event create failed: ${JSON.stringify(result)}`);
        return {
          success: false,
          error: this.extractSalesforceError(result),
          timestamp: now().toJSDate(),
        };
      }

      return {
        success: true,
        externalId: result.id,
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Salesforce meeting sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  async pullContacts(since: Date | null): Promise<PullContactsResult> {
    if (!this.config?.accessToken || !this.config?.instanceUrl) {
      throw new Error("Salesforce not configured");
    }

    const fields = [
      "Id",
      "FirstName",
      "LastName",
      "Company",
      "Email",
      "Phone",
      "Title",
      "Street",
      "City",
      "State",
      "PostalCode",
      "Country",
      "Description",
      "Status",
      "Rating",
      "AnnualRevenue",
      "LastModifiedDate",
    ].join(", ");

    let query = `SELECT ${fields} FROM Lead`;
    if (since) {
      const sinceStr = since.toISOString();
      query += ` WHERE LastModifiedDate > ${sinceStr}`;
    }
    query += " ORDER BY LastModifiedDate ASC LIMIT 200";

    const response = await fetch(this.apiUrl(`/query?q=${encodeURIComponent(query)}`), {
      headers: this.headers(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(this.extractSalesforceError(error));
    }

    const result: SalesforceQueryResult<SalesforceLead> = await response.json();

    const contacts = result.records.map((lead) => this.leadToContactData(lead));

    const lastRecord = result.records.at(-1);
    const nextSyncToken = lastRecord ? lastRecord.LastModifiedDate : null;

    return { contacts, nextSyncToken };
  }

  async pullMeetings(since: Date | null): Promise<PullMeetingsResult> {
    if (!this.config?.accessToken || !this.config?.instanceUrl) {
      throw new Error("Salesforce not configured");
    }

    const fields = [
      "Id",
      "Subject",
      "Description",
      "StartDateTime",
      "EndDateTime",
      "Location",
      "WhoId",
      "WhatId",
      "LastModifiedDate",
    ].join(", ");

    let query = `SELECT ${fields} FROM Event`;
    if (since) {
      const sinceStr = since.toISOString();
      query += ` WHERE LastModifiedDate > ${sinceStr}`;
    }
    query += " ORDER BY LastModifiedDate ASC LIMIT 200";

    const response = await fetch(this.apiUrl(`/query?q=${encodeURIComponent(query)}`), {
      headers: this.headers(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(this.extractSalesforceError(error));
    }

    const result: SalesforceQueryResult<SalesforceEvent> = await response.json();

    const meetings = result.records.map((event) => this.eventToMeetingData(event));

    const lastRecord = result.records.at(-1);
    const nextSyncToken = lastRecord ? lastRecord.LastModifiedDate : null;

    return { meetings, nextSyncToken };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.accessToken || !this.config?.instanceUrl) {
      return { success: false, message: "Salesforce not configured" };
    }

    try {
      const response = await fetch(this.apiUrl("/sobjects"), {
        headers: this.headers(),
      });

      if (response.ok) {
        return { success: true, message: "Connected to Salesforce" };
      }

      const error = await response.json();
      return { success: false, message: this.extractSalesforceError(error) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: errorMessage };
    }
  }

  private splitName(fullName: string | null): { firstName: string | null; lastName: string } {
    if (!fullName) {
      return { firstName: null, lastName: "Unknown" };
    }

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: null, lastName: parts[0] };
    }

    const lastName = parts.pop() ?? "Unknown";
    const firstName = parts.join(" ");
    return { firstName: firstName || null, lastName };
  }

  private mapProspectStatusToSalesforce(status: string): string {
    const statusMap: Record<string, string> = {
      new: "Open - Not Contacted",
      contacted: "Working - Contacted",
      qualified: "Closed - Converted",
      proposal: "Working - Contacted",
      won: "Closed - Converted",
      lost: "Closed - Not Converted",
    };
    return statusMap[status] ?? "Open - Not Contacted";
  }

  private mapScoreToRating(score: number): string {
    if (score >= 80) {
      return "Hot";
    }
    if (score >= 50) {
      return "Warm";
    }
    return "Cold";
  }

  private removeNullValues(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  private extractSalesforceError(error: unknown): string {
    if (Array.isArray(error)) {
      const firstError = error[0] as { message?: string; errorCode?: string } | undefined;
      return firstError?.message ?? firstError?.errorCode ?? "Unknown Salesforce error";
    }
    if (typeof error === "object" && error !== null) {
      const errorObj = error as { message?: string; error?: string; error_description?: string };
      return (
        errorObj.message ??
        errorObj.error_description ??
        errorObj.error ??
        "Unknown Salesforce error"
      );
    }
    return "Unknown Salesforce error";
  }

  private buildMeetingDescription(meeting: Meeting): string {
    const parts: string[] = [];

    if (meeting.description) {
      parts.push(meeting.description);
    }

    if (meeting.notes) {
      parts.push(`\n\nNotes:\n${meeting.notes}`);
    }

    if (meeting.outcomes) {
      parts.push(`\n\nOutcomes:\n${meeting.outcomes}`);
    }

    if (meeting.actionItems && meeting.actionItems.length > 0) {
      const actionItemsText = meeting.actionItems
        .map((item) => `- ${item.task}${item.assignee ? ` (${item.assignee})` : ""}`)
        .join("\n");
      parts.push(`\n\nAction Items:\n${actionItemsText}`);
    }

    return parts.join("");
  }

  private leadToContactData(lead: SalesforceLead): CrmContactData {
    const fullName = [lead.FirstName, lead.LastName].filter(Boolean).join(" ");

    return {
      externalId: lead.Id,
      companyName: lead.Company,
      contactName: fullName || null,
      email: lead.Email,
      phone: lead.Phone,
      address: lead.Street,
      city: lead.City,
      state: lead.State,
      postalCode: lead.PostalCode,
      country: lead.Country,
      notes: lead.Description,
      status: this.mapSalesforceStatusToProspect(lead.Status),
      source: null,
      industry: null,
      customFields: {
        salesforceRating: lead.Rating,
        salesforceAnnualRevenue: lead.AnnualRevenue,
      },
    };
  }

  private mapSalesforceStatusToProspect(status: string): string {
    const statusMap: Record<string, string> = {
      "Open - Not Contacted": "new",
      "Working - Contacted": "contacted",
      "Closed - Converted": "won",
      "Closed - Not Converted": "lost",
    };
    return statusMap[status] ?? "new";
  }

  private eventToMeetingData(event: SalesforceEvent): CrmMeetingData {
    return {
      externalId: event.Id,
      contactExternalId: event.WhoId ?? undefined,
      title: event.Subject,
      scheduledAt: event.StartDateTime,
      endedAt: event.EndDateTime,
      location: event.Location,
      notes: event.Description,
      outcome: null,
      summary: null,
    };
  }
}
