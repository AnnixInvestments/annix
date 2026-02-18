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

interface PipedriveConfig extends CrmAdapterConfig {
  accessToken: string;
  apiDomain: string;
}

interface PipedrivePerson {
  id: number;
  name: string;
  email: Array<{ value: string; primary: boolean }>;
  phone: Array<{ value: string; primary: boolean }>;
  org_id: { value: number; name: string } | null;
  org_name?: string;
  update_time: string;
  add_time: string;
  notes?: string;
  postal_address?: string;
  postal_address_city?: string;
  postal_address_state?: string;
  postal_address_postal_code?: string;
  postal_address_country?: string;
  [key: string]: unknown;
}

interface PipedriveActivity {
  id: number;
  subject: string;
  type: string;
  due_date: string;
  due_time: string;
  duration: string;
  note: string;
  location: string;
  person_id: number | null;
  org_id: number | null;
  deal_id: number | null;
  update_time: string;
  add_time: string;
  done: boolean;
  [key: string]: unknown;
}

interface PipedriveOrganization {
  id: number;
  name: string;
  address: string;
  address_locality: string;
  address_admin_area_level_1: string;
  address_postal_code: string;
  address_country: string;
}

interface PipedriveResponse<T> {
  success: boolean;
  data: T;
  additional_data?: {
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
      next_start?: number;
    };
  };
  error?: string;
  error_info?: string;
}

export class PipedriveAdapter implements ICrmAdapter {
  private readonly logger = new Logger(PipedriveAdapter.name);
  private config: PipedriveConfig | null = null;

  readonly type = "pipedrive";

  get name(): string {
    return this.config?.name ?? "Pipedrive CRM";
  }

  configure(config: CrmAdapterConfig): void {
    this.config = config as PipedriveConfig;
  }

  configureOAuth(oauthConfig: CrmOAuthConfig, adapterConfig: CrmAdapterConfig): void {
    this.config = {
      ...adapterConfig,
      accessToken: oauthConfig.accessToken,
      apiDomain: oauthConfig.instanceUrl ?? "https://api.pipedrive.com",
    };
  }

  private apiUrl(path: string): string {
    const domain = this.config?.apiDomain ?? "https://api.pipedrive.com";
    return `${domain}/v1${path}`;
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
        error: "Pipedrive not configured - missing access token",
        timestamp: now().toJSDate(),
      };
    }

    try {
      const isUpdate = Boolean(prospect.crmExternalId);

      let orgId: number | null = null;
      if (prospect.companyName) {
        orgId = await this.findOrCreateOrganization(prospect);
      }

      const personData: Record<string, unknown> = {
        name: prospect.contactName ?? prospect.companyName,
        email: prospect.contactEmail ? [{ value: prospect.contactEmail, primary: true }] : [],
        phone: prospect.contactPhone ? [{ value: prospect.contactPhone, primary: true }] : [],
        org_id: orgId,
      };

      if (prospect.streetAddress) {
        personData.postal_address = prospect.streetAddress;
      }
      if (prospect.city) {
        personData.postal_address_city = prospect.city;
      }
      if (prospect.province) {
        personData.postal_address_state = prospect.province;
      }
      if (prospect.postalCode) {
        personData.postal_address_postal_code = prospect.postalCode;
      }
      if (prospect.country) {
        personData.postal_address_country = prospect.country;
      }

      if (isUpdate && prospect.crmExternalId) {
        const response = await fetch(this.apiUrl(`/persons/${prospect.crmExternalId}`), {
          method: "PUT",
          headers: this.headers(),
          body: JSON.stringify(personData),
        });

        const result: PipedriveResponse<PipedrivePerson> = await response.json();

        if (!result.success) {
          this.logger.error(`Pipedrive update failed: ${result.error}`);
          return {
            success: false,
            error: result.error ?? "Update failed",
            timestamp: now().toJSDate(),
          };
        }

        return {
          success: true,
          externalId: prospect.crmExternalId,
          timestamp: now().toJSDate(),
        };
      }

      const response = await fetch(this.apiUrl("/persons"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(personData),
      });

      const result: PipedriveResponse<PipedrivePerson> = await response.json();

      if (!result.success) {
        this.logger.error(`Pipedrive create failed: ${result.error}`);
        return {
          success: false,
          error: result.error ?? "Create failed",
          timestamp: now().toJSDate(),
        };
      }

      return {
        success: true,
        externalId: String(result.data.id),
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Pipedrive sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  private async findOrCreateOrganization(prospect: Prospect): Promise<number | null> {
    try {
      const searchResponse = await fetch(
        this.apiUrl(
          `/organizations/search?term=${encodeURIComponent(prospect.companyName)}&limit=1`,
        ),
        { headers: this.headers() },
      );

      const searchResult: PipedriveResponse<{ items: Array<{ item: PipedriveOrganization }> }> =
        await searchResponse.json();

      if (searchResult.success && searchResult.data.items.length > 0) {
        return searchResult.data.items[0].item.id;
      }

      const orgData: Record<string, string | null> = {
        name: prospect.companyName,
        address: prospect.streetAddress,
        address_locality: prospect.city,
        address_admin_area_level_1: prospect.province,
        address_postal_code: prospect.postalCode,
        address_country: prospect.country,
      };

      const cleanedOrgData = Object.entries(orgData).reduce(
        (acc, [key, value]) => {
          if (value !== null) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      const createResponse = await fetch(this.apiUrl("/organizations"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(cleanedOrgData),
      });

      const createResult: PipedriveResponse<PipedriveOrganization> = await createResponse.json();

      if (createResult.success) {
        return createResult.data.id;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to find/create organization: ${prospect.companyName}`);
      return null;
    }
  }

  async syncMeeting(meeting: Meeting, prospect: Prospect): Promise<CrmSyncResult> {
    if (!this.config?.accessToken) {
      return {
        success: false,
        error: "Pipedrive not configured - missing access token",
        timestamp: now().toJSDate(),
      };
    }

    try {
      const isUpdate = Boolean(meeting.crmExternalId);

      const dueDate = meeting.scheduledStart.toISOString().split("T")[0];
      const dueTime = meeting.scheduledStart.toISOString().split("T")[1].substring(0, 5);
      const durationMinutes = Math.round(
        (meeting.scheduledEnd.getTime() - meeting.scheduledStart.getTime()) / 60000,
      );
      const durationHours = Math.floor(durationMinutes / 60);
      const durationMins = durationMinutes % 60;
      const duration = `${String(durationHours).padStart(2, "0")}:${String(durationMins).padStart(2, "0")}`;

      const activityData: Record<string, unknown> = {
        subject: meeting.title,
        type: this.mapMeetingTypeToPipedrive(meeting.meetingType),
        due_date: dueDate,
        due_time: dueTime,
        duration,
        note: this.buildMeetingDescription(meeting),
        location: meeting.location,
        person_id: prospect.crmExternalId ? parseInt(prospect.crmExternalId, 10) : null,
        done: meeting.status === "completed",
      };

      if (isUpdate && meeting.crmExternalId) {
        const response = await fetch(this.apiUrl(`/activities/${meeting.crmExternalId}`), {
          method: "PUT",
          headers: this.headers(),
          body: JSON.stringify(activityData),
        });

        const result: PipedriveResponse<PipedriveActivity> = await response.json();

        if (!result.success) {
          this.logger.error(`Pipedrive activity update failed: ${result.error}`);
          return {
            success: false,
            error: result.error ?? "Update failed",
            timestamp: now().toJSDate(),
          };
        }

        return {
          success: true,
          externalId: meeting.crmExternalId,
          timestamp: now().toJSDate(),
        };
      }

      const response = await fetch(this.apiUrl("/activities"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(activityData),
      });

      const result: PipedriveResponse<PipedriveActivity> = await response.json();

      if (!result.success) {
        this.logger.error(`Pipedrive activity create failed: ${result.error}`);
        return {
          success: false,
          error: result.error ?? "Create failed",
          timestamp: now().toJSDate(),
        };
      }

      return {
        success: true,
        externalId: String(result.data.id),
        timestamp: now().toJSDate(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Pipedrive meeting sync error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        timestamp: now().toJSDate(),
      };
    }
  }

  async pullContacts(since: Date | null): Promise<PullContactsResult> {
    if (!this.config?.accessToken) {
      throw new Error("Pipedrive not configured");
    }

    let url = this.apiUrl("/persons?limit=100&sort=update_time ASC");
    if (since) {
      url += `&since=${since.toISOString()}`;
    }

    const response = await fetch(url, { headers: this.headers() });
    const result: PipedriveResponse<PipedrivePerson[] | null> = await response.json();

    if (!result.success) {
      throw new Error(result.error ?? "Failed to pull contacts");
    }

    const persons = result.data ?? [];
    const contacts = persons.map((person) => this.pipedrivePersonToContactData(person));
    const lastPerson = persons.at(-1);
    const nextSyncToken = lastPerson?.update_time ?? null;

    return { contacts, nextSyncToken };
  }

  async pullMeetings(since: Date | null): Promise<PullMeetingsResult> {
    if (!this.config?.accessToken) {
      throw new Error("Pipedrive not configured");
    }

    let url = this.apiUrl("/activities?limit=100&sort=update_time ASC");
    if (since) {
      url += `&since=${since.toISOString()}`;
    }

    const response = await fetch(url, { headers: this.headers() });
    const result: PipedriveResponse<PipedriveActivity[] | null> = await response.json();

    if (!result.success) {
      throw new Error(result.error ?? "Failed to pull meetings");
    }

    const activities = result.data ?? [];
    const meetings = activities
      .filter((activity) => ["meeting", "call"].includes(activity.type))
      .map((activity) => this.pipedriveActivityToMeetingData(activity));

    const lastActivity = activities.at(-1);
    const nextSyncToken = lastActivity?.update_time ?? null;

    return { meetings, nextSyncToken };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.accessToken) {
      return { success: false, message: "Pipedrive not configured" };
    }

    try {
      const response = await fetch(this.apiUrl("/users/me"), {
        headers: this.headers(),
      });

      const result: PipedriveResponse<unknown> = await response.json();

      if (result.success) {
        return { success: true, message: "Connected to Pipedrive" };
      }

      return { success: false, message: result.error ?? "Connection failed" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: errorMessage };
    }
  }

  private mapMeetingTypeToPipedrive(meetingType: string): string {
    const typeMap: Record<string, string> = {
      in_person: "meeting",
      phone: "call",
      video: "meeting",
    };
    return typeMap[meetingType] ?? "meeting";
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

  private pipedrivePersonToContactData(person: PipedrivePerson): CrmContactData {
    const primaryEmail =
      person.email.find((e) => e.primary)?.value ?? person.email[0]?.value ?? null;
    const primaryPhone =
      person.phone.find((p) => p.primary)?.value ?? person.phone[0]?.value ?? null;

    return {
      externalId: String(person.id),
      companyName: person.org_name ?? person.org_id?.name ?? "Unknown Company",
      contactName: person.name,
      email: primaryEmail,
      phone: primaryPhone,
      address: person.postal_address ?? null,
      city: person.postal_address_city ?? null,
      state: person.postal_address_state ?? null,
      postalCode: person.postal_address_postal_code ?? null,
      country: person.postal_address_country ?? null,
      notes: person.notes ?? null,
      status: "new",
      source: null,
      industry: null,
      customFields: {},
    };
  }

  private pipedriveActivityToMeetingData(activity: PipedriveActivity): CrmMeetingData {
    const dueDateTime = `${activity.due_date}T${activity.due_time || "00:00"}:00Z`;
    const durationParts = activity.duration?.split(":") ?? ["01", "00"];
    const durationMs =
      (parseInt(durationParts[0], 10) * 60 + parseInt(durationParts[1], 10)) * 60000;
    const endDateTime = new Date(new Date(dueDateTime).getTime() + durationMs).toISOString();

    return {
      externalId: String(activity.id),
      contactExternalId: activity.person_id ? String(activity.person_id) : undefined,
      title: activity.subject,
      scheduledAt: dueDateTime,
      endedAt: endDateTime,
      location: activity.location,
      notes: activity.note,
      outcome: activity.done ? "completed" : null,
      summary: null,
    };
  }
}
