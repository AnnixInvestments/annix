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
import type { PullContactsResult, PullMeetingsResult } from "./salesforce.adapter";

interface HubSpotConfig extends CrmAdapterConfig {
  accessToken: string;
}

interface HubSpotContactProperties {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  jobtitle?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  notes?: string;
  lifecyclestage?: string;
  hs_lead_status?: string;
}

interface HubSpotContact {
  id: string;
  properties: HubSpotContactProperties & {
    hs_object_id: string;
    lastmodifieddate: string;
    createdate: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotContactsResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

interface HubSpotEngagement {
  id: string;
  properties: {
    hs_meeting_title?: string;
    hs_meeting_body?: string;
    hs_meeting_location?: string;
    hs_meeting_start_time?: string;
    hs_meeting_end_time?: string;
    hs_meeting_outcome?: string;
    hs_timestamp: string;
    hs_lastmodifieddate: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotEngagementsResponse {
  results: HubSpotEngagement[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

interface HubSpotCreateResponse {
  id: string;
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

export class HubSpotAdapter implements ICrmAdapter {
  private readonly logger = new Logger(HubSpotAdapter.name);
  private config: HubSpotConfig | null = null;
  private readonly apiBaseUrl = "https://api.hubapi.com";

  readonly type = "hubspot";

  get name(): string {
    return this.config?.name ?? "HubSpot CRM";
  }

  configure(config: CrmAdapterConfig): void {
    this.config = config as HubSpotConfig;
  }

  configureOAuth(oauthConfig: CrmOAuthConfig, adapterConfig: CrmAdapterConfig): void {
    this.config = {
      ...adapterConfig,
      accessToken: oauthConfig.accessToken,
    };
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config?.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async syncContact(prospect: Prospect): Promise<CrmSyncResult> {
    if (!this.config?.accessToken) {
      return {
        success: false,
        error: "HubSpot not configured - missing access token",
        timestamp: now().toJSDate(),
      };
    }

    try {
      const isUpdate = Boolean(prospect.crmExternalId);
      const nameParts = this.splitName(prospect.contactName);

      const properties: HubSpotContactProperties = {
        firstname: nameParts.firstName ?? undefined,
        lastname: nameParts.lastName,
        email: prospect.contactEmail ?? undefined,
        phone: prospect.contactPhone ?? undefined,
        jobtitle: prospect.contactTitle ?? undefined,
        company: prospect.companyName,
        address: prospect.streetAddress ?? undefined,
        city: prospect.city ?? undefined,
        state: prospect.province ?? undefined,
        zip: prospect.postalCode ?? undefined,
        country: prospect.country ?? undefined,
        lifecyclestage: this.mapProspectStatusToHubSpot(prospect.status),
        hs_lead_status: this.mapScoreToLeadStatus(prospect.score),
      };

      const cleanedProperties = this.removeUndefinedValues(
        properties as unknown as Record<string, unknown>,
      );

      if (isUpdate && prospect.crmExternalId) {
        const response = await fetch(
          `${this.apiBaseUrl}/crm/v3/objects/contacts/${prospect.crmExternalId}`,
          {
            method: "PATCH",
            headers: this.headers(),
            body: JSON.stringify({ properties: cleanedProperties }),
          },
        );

        if (!response.ok) {
          const error: HubSpotError = await response.json();
          this.logger.error(`HubSpot update failed: ${error.message}`);
          return {
            success: false,
            error: error.message,
            timestamp: now().toJSDate(),
          };
        }

        return {
          success: true,
          externalId: prospect.crmExternalId,
          timestamp: now().toJSDate(),
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/crm/v3/objects/contacts`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ properties: cleanedProperties }),
      });

      const result = await response.json();

      if (!response.ok) {
        const error = result as HubSpotError;
        this.logger.error(`HubSpot create failed: ${error.message}`);
        return {
          success: false,
          error: error.message,
          timestamp: now().toJSDate(),
        };
      }

      const created = result as HubSpotCreateResponse;
      return {
        success: true,
        externalId: created.id,
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`HubSpot sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  async syncMeeting(meeting: Meeting, prospect: Prospect): Promise<CrmSyncResult> {
    if (!this.config?.accessToken) {
      return {
        success: false,
        error: "HubSpot not configured - missing access token",
        timestamp: now().toJSDate(),
      };
    }

    try {
      const isUpdate = Boolean(meeting.crmExternalId);

      const properties: Record<string, string | number> = {
        hs_meeting_title: meeting.title,
        hs_meeting_body: this.buildMeetingDescription(meeting),
        hs_meeting_location: meeting.location ?? "",
        hs_meeting_start_time: meeting.scheduledStart.getTime().toString(),
        hs_meeting_end_time: meeting.scheduledEnd.getTime().toString(),
        hs_timestamp: meeting.scheduledStart.getTime().toString(),
      };

      if (meeting.outcomes) {
        properties.hs_meeting_outcome = meeting.outcomes;
      }

      if (isUpdate && meeting.crmExternalId) {
        const response = await fetch(
          `${this.apiBaseUrl}/crm/v3/objects/meetings/${meeting.crmExternalId}`,
          {
            method: "PATCH",
            headers: this.headers(),
            body: JSON.stringify({ properties }),
          },
        );

        if (!response.ok) {
          const error: HubSpotError = await response.json();
          this.logger.error(`HubSpot meeting update failed: ${error.message}`);
          return {
            success: false,
            error: error.message,
            timestamp: now().toJSDate(),
          };
        }

        return {
          success: true,
          externalId: meeting.crmExternalId,
          timestamp: now().toJSDate(),
        };
      }

      const createResponse = await fetch(`${this.apiBaseUrl}/crm/v3/objects/meetings`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ properties }),
      });

      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        const error = createResult as HubSpotError;
        this.logger.error(`HubSpot meeting create failed: ${error.message}`);
        return {
          success: false,
          error: error.message,
          timestamp: now().toJSDate(),
        };
      }

      const created = createResult as HubSpotCreateResponse;

      if (prospect.crmExternalId) {
        await this.associateMeetingToContact(created.id, prospect.crmExternalId);
      }

      return {
        success: true,
        externalId: created.id,
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`HubSpot meeting sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  private async associateMeetingToContact(meetingId: string, contactId: string): Promise<void> {
    try {
      await fetch(
        `${this.apiBaseUrl}/crm/v4/objects/meetings/${meetingId}/associations/contacts/${contactId}`,
        {
          method: "PUT",
          headers: this.headers(),
          body: JSON.stringify([
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 200,
            },
          ]),
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to associate meeting ${meetingId} to contact ${contactId}`);
    }
  }

  async pullContacts(since: Date | null): Promise<PullContactsResult> {
    if (!this.config?.accessToken) {
      throw new Error("HubSpot not configured");
    }

    const properties = [
      "firstname",
      "lastname",
      "email",
      "phone",
      "jobtitle",
      "company",
      "address",
      "city",
      "state",
      "zip",
      "country",
      "lifecyclestage",
      "hs_lead_status",
      "lastmodifieddate",
    ];

    const url = `${this.apiBaseUrl}/crm/v3/objects/contacts?limit=100&properties=${properties.join(",")}`;

    if (since) {
      const filterGroups = [
        {
          filters: [
            {
              propertyName: "lastmodifieddate",
              operator: "GTE",
              value: since.getTime().toString(),
            },
          ],
        },
      ];

      const searchResponse = await fetch(`${this.apiBaseUrl}/crm/v3/objects/contacts/search`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          filterGroups,
          properties,
          limit: 100,
          sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
        }),
      });

      if (!searchResponse.ok) {
        const error: HubSpotError = await searchResponse.json();
        throw new Error(error.message);
      }

      const result: HubSpotContactsResponse = await searchResponse.json();
      const contacts = result.results.map((contact) => this.hubspotContactToContactData(contact));
      const lastContact = result.results.at(-1);
      const nextSyncToken = lastContact?.properties.lastmodifieddate ?? null;

      return { contacts, nextSyncToken };
    }

    const response = await fetch(url, { headers: this.headers() });

    if (!response.ok) {
      const error: HubSpotError = await response.json();
      throw new Error(error.message);
    }

    const result: HubSpotContactsResponse = await response.json();
    const contacts = result.results.map((contact) => this.hubspotContactToContactData(contact));
    const lastContact = result.results.at(-1);
    const nextSyncToken = lastContact?.properties.lastmodifieddate ?? null;

    return { contacts, nextSyncToken };
  }

  async pullMeetings(since: Date | null): Promise<PullMeetingsResult> {
    if (!this.config?.accessToken) {
      throw new Error("HubSpot not configured");
    }

    const properties = [
      "hs_meeting_title",
      "hs_meeting_body",
      "hs_meeting_location",
      "hs_meeting_start_time",
      "hs_meeting_end_time",
      "hs_meeting_outcome",
      "hs_timestamp",
      "hs_lastmodifieddate",
    ];

    if (since) {
      const filterGroups = [
        {
          filters: [
            {
              propertyName: "hs_lastmodifieddate",
              operator: "GTE",
              value: since.getTime().toString(),
            },
          ],
        },
      ];

      const searchResponse = await fetch(`${this.apiBaseUrl}/crm/v3/objects/meetings/search`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          filterGroups,
          properties,
          limit: 100,
          sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
        }),
      });

      if (!searchResponse.ok) {
        const error: HubSpotError = await searchResponse.json();
        throw new Error(error.message);
      }

      const result: HubSpotEngagementsResponse = await searchResponse.json();
      const meetings = result.results.map((engagement) =>
        this.hubspotEngagementToMeetingData(engagement),
      );
      const lastMeeting = result.results.at(-1);
      const nextSyncToken = lastMeeting?.properties.hs_lastmodifieddate ?? null;

      return { meetings, nextSyncToken };
    }

    const url = `${this.apiBaseUrl}/crm/v3/objects/meetings?limit=100&properties=${properties.join(",")}`;
    const response = await fetch(url, { headers: this.headers() });

    if (!response.ok) {
      const error: HubSpotError = await response.json();
      throw new Error(error.message);
    }

    const result: HubSpotEngagementsResponse = await response.json();
    const meetings = result.results.map((engagement) =>
      this.hubspotEngagementToMeetingData(engagement),
    );
    const lastMeeting = result.results.at(-1);
    const nextSyncToken = lastMeeting?.properties.hs_lastmodifieddate ?? null;

    return { meetings, nextSyncToken };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.accessToken) {
      return { success: false, message: "HubSpot not configured" };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/crm/v3/objects/contacts?limit=1`, {
        headers: this.headers(),
      });

      if (response.ok) {
        return { success: true, message: "Connected to HubSpot" };
      }

      const error: HubSpotError = await response.json();
      return { success: false, message: error.message };
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

  private mapProspectStatusToHubSpot(status: string): string {
    const statusMap: Record<string, string> = {
      new: "subscriber",
      contacted: "lead",
      qualified: "marketingqualifiedlead",
      proposal: "salesqualifiedlead",
      won: "customer",
      lost: "other",
    };
    return statusMap[status] ?? "subscriber";
  }

  private mapScoreToLeadStatus(score: number): string {
    if (score >= 80) {
      return "QUALIFIED";
    }
    if (score >= 50) {
      return "IN_PROGRESS";
    }
    return "NEW";
  }

  private removeUndefinedValues(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
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

  private hubspotContactToContactData(contact: HubSpotContact): CrmContactData {
    const props = contact.properties;
    const fullName = [props.firstname, props.lastname].filter(Boolean).join(" ");

    return {
      externalId: contact.id,
      companyName: props.company ?? "Unknown Company",
      contactName: fullName || null,
      email: props.email ?? null,
      phone: props.phone ?? null,
      address: props.address ?? null,
      city: props.city ?? null,
      state: props.state ?? null,
      postalCode: props.zip ?? null,
      country: props.country ?? null,
      notes: null,
      status: this.mapHubSpotStatusToProspect(props.lifecyclestage),
      source: null,
      industry: null,
      customFields: {
        hubspotLeadStatus: props.hs_lead_status,
        hubspotLifecycleStage: props.lifecyclestage,
      },
    };
  }

  private mapHubSpotStatusToProspect(lifecycleStage: string | undefined): string {
    const statusMap: Record<string, string> = {
      subscriber: "new",
      lead: "contacted",
      marketingqualifiedlead: "qualified",
      salesqualifiedlead: "proposal",
      opportunity: "proposal",
      customer: "won",
      evangelist: "won",
      other: "lost",
    };
    return statusMap[lifecycleStage ?? ""] ?? "new";
  }

  private hubspotEngagementToMeetingData(engagement: HubSpotEngagement): CrmMeetingData {
    const props = engagement.properties;

    return {
      externalId: engagement.id,
      contactExternalId: undefined,
      title: props.hs_meeting_title ?? "Meeting",
      scheduledAt: props.hs_meeting_start_time
        ? new Date(parseInt(props.hs_meeting_start_time, 10)).toISOString()
        : new Date(parseInt(props.hs_timestamp, 10)).toISOString(),
      endedAt: props.hs_meeting_end_time
        ? new Date(parseInt(props.hs_meeting_end_time, 10)).toISOString()
        : null,
      location: props.hs_meeting_location ?? null,
      notes: props.hs_meeting_body ?? null,
      outcome: props.hs_meeting_outcome ?? null,
      summary: null,
    };
  }
}
