import type { Meeting, Prospect } from "../entities";

export interface CrmContactData {
  externalId?: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  status: string;
  source: string | null;
  industry: string | null;
  customFields: Record<string, unknown>;
}

export interface CrmMeetingData {
  externalId?: string;
  contactExternalId?: string;
  title: string;
  scheduledAt: string;
  endedAt: string | null;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  summary: {
    overview: string | null;
    keyPoints: string[];
    actionItems: Array<{
      task: string;
      assignee: string | null;
      dueDate: string | null;
    }>;
    nextSteps: string[];
  } | null;
}

export interface CrmSyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
  timestamp: Date;
}

export interface CrmFieldMapping {
  sourceField: string;
  targetField: string;
  transform?: "uppercase" | "lowercase" | "date" | "datetime" | "boolean" | "number";
}

export interface CrmAdapterConfig {
  type: "webhook" | "csv";
  name: string;
  enabled: boolean;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  webhookMethod?: "POST" | "PUT" | "PATCH";
  fieldMappings: CrmFieldMapping[];
  syncContacts: boolean;
  syncMeetings: boolean;
  autoSync: boolean;
}

export interface ICrmAdapter {
  readonly type: string;
  readonly name: string;

  configure(config: CrmAdapterConfig): void;

  syncContact(prospect: Prospect): Promise<CrmSyncResult>;

  syncMeeting(meeting: Meeting, prospect: Prospect): Promise<CrmSyncResult>;

  testConnection(): Promise<{ success: boolean; message: string }>;
}

export function prospectToCrmContact(prospect: Prospect): CrmContactData {
  return {
    externalId: prospect.crmExternalId ?? undefined,
    companyName: prospect.companyName,
    contactName: prospect.contactName,
    email: prospect.contactEmail,
    phone: prospect.contactPhone,
    address: prospect.streetAddress,
    city: prospect.city,
    state: prospect.province,
    postalCode: prospect.postalCode,
    country: prospect.country,
    notes: prospect.notes,
    status: prospect.status,
    source: null,
    industry: null,
    customFields: (prospect.customFields as Record<string, unknown>) ?? {},
  };
}

export function meetingToCrmMeeting(
  meeting: Meeting,
  summary: CrmMeetingData["summary"] | null,
): CrmMeetingData {
  return {
    externalId: meeting.crmExternalId ?? undefined,
    contactExternalId: meeting.prospect?.crmExternalId ?? undefined,
    title: meeting.title,
    scheduledAt: meeting.scheduledStart.toISOString(),
    endedAt: meeting.actualEnd?.toISOString() ?? null,
    location: meeting.location,
    notes: meeting.notes,
    outcome: meeting.outcomes,
    summary,
  };
}
