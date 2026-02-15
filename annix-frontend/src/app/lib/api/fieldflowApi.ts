import { browserBaseUrl, getAuthHeaders } from "@/lib/api-config";

export type CalendarProvider = "google" | "outlook" | "apple" | "caldav";
export type CalendarSyncStatus = "active" | "paused" | "error" | "expired";
export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export type ProspectStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ProspectPriority = "low" | "medium" | "high" | "urgent";
export type MeetingType = "in_person" | "phone" | "video";
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
export type VisitType = "cold_call" | "scheduled" | "follow_up" | "drop_in";
export type VisitOutcome =
  | "successful"
  | "no_answer"
  | "rescheduled"
  | "not_interested"
  | "follow_up_required"
  | "converted";

export interface Prospect {
  id: number;
  ownerId: number;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactTitle: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  status: ProspectStatus;
  priority: ProspectPriority;
  notes: string | null;
  tags: string[] | null;
  estimatedValue: number | null;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
  customFields: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProspectDto {
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactTitle?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  status?: ProspectStatus;
  priority?: ProspectPriority;
  notes?: string;
  tags?: string[];
  estimatedValue?: number;
  nextFollowUpAt?: string;
  customFields?: Record<string, unknown>;
}

export interface Visit {
  id: number;
  prospectId: number;
  salesRepId: number;
  visitType: VisitType;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  outcome: VisitOutcome | null;
  notes: string | null;
  contactMet: string | null;
  nextSteps: string | null;
  followUpDate: Date | null;
  createdAt: Date;
  prospect?: Prospect;
}

export interface CreateVisitDto {
  prospectId: number;
  visitType?: VisitType;
  scheduledAt?: string;
  notes?: string;
}

export interface Meeting {
  id: number;
  prospectId: number | null;
  salesRepId: number;
  calendarEventId: number | null;
  title: string;
  description: string | null;
  meetingType: MeetingType;
  status: MeetingStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  attendees: string[] | null;
  agenda: string | null;
  notes: string | null;
  outcomes: string | null;
  actionItems: Array<{ task: string; assignee: string | null; dueDate: string | null }> | null;
  summarySent: boolean;
  createdAt: Date;
  updatedAt: Date;
  prospect?: Prospect | null;
}

export interface CreateMeetingDto {
  prospectId?: number;
  title: string;
  description?: string;
  meetingType?: MeetingType;
  scheduledStart: string;
  scheduledEnd: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  attendees?: string[];
  agenda?: string;
}

export interface FieldFlowDashboard {
  stats: {
    totalProspects: number;
    activeProspects: number;
    todaysMeetings: number;
    followUpsDue: number;
  };
  todaysMeetings: Array<{
    id: number;
    title: string;
    prospectCompany: string | null;
    time: string;
    type: MeetingType;
  }>;
}

export interface CalendarConnection {
  id: number;
  userId: number;
  provider: CalendarProvider;
  accountEmail: string;
  accountName: string | null;
  syncStatus: CalendarSyncStatus;
  lastSyncAt: Date | null;
  selectedCalendars: string[] | null;
  isPrimary: boolean;
  createdAt: Date;
}

export interface CalendarEvent {
  id: number;
  connectionId: number;
  externalId: string;
  provider: CalendarProvider;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location: string | null;
  status: CalendarEventStatus;
  attendees: string[] | null;
  meetingUrl: string | null;
  isRecurring: boolean;
}

export interface CalendarListItem {
  id: string;
  name: string;
  isPrimary: boolean;
  color: string | null;
}

export interface ConnectCalendarDto {
  provider: CalendarProvider;
  authCode: string;
  redirectUri?: string;
  caldavUrl?: string;
}

export interface UpdateCalendarConnectionDto {
  selectedCalendars?: string[];
  isPrimary?: boolean;
}

export interface SyncCalendarDto {
  fullSync?: boolean;
}

export interface SyncResult {
  synced: number;
  deleted: number;
  errors: string[];
}

export type RecordingProcessingStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "transcribing"
  | "completed"
  | "failed";
export type Sentiment = "positive" | "neutral" | "negative";
export type CrmType = "webhook" | "csv_export" | "salesforce" | "hubspot" | "pipedrive" | "custom";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform: string | null;
}

export interface WebhookConfig {
  url: string;
  method: "POST" | "PUT" | "PATCH";
  headers: Record<string, string>;
  authType: "none" | "basic" | "bearer" | "api_key";
}

export interface CrmConfig {
  id: number;
  userId: number;
  name: string;
  crmType: CrmType;
  isActive: boolean;
  webhookConfig: WebhookConfig | null;
  instanceUrl: string | null;
  prospectFieldMappings: FieldMapping[] | null;
  meetingFieldMappings: FieldMapping[] | null;
  syncProspects: boolean;
  syncMeetings: boolean;
  syncOnCreate: boolean;
  syncOnUpdate: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  createdAt: Date;
}

export interface CreateCrmConfigDto {
  name: string;
  crmType: CrmType;
  webhookConfig?: WebhookConfig;
  apiKey?: string;
  apiSecret?: string;
  instanceUrl?: string;
  prospectFieldMappings?: FieldMapping[];
  meetingFieldMappings?: FieldMapping[];
  syncProspects?: boolean;
  syncMeetings?: boolean;
  syncOnCreate?: boolean;
  syncOnUpdate?: boolean;
}

export interface UpdateCrmConfigDto extends Partial<CreateCrmConfigDto> {
  isActive?: boolean;
}

export interface CrmSyncResult {
  success: boolean;
  message: string | null;
  externalId: string | null;
  error: string | null;
}

export interface CrmSyncStatus {
  configId: number;
  isActive: boolean;
  lastSyncAt: Date | null;
  prospectsSynced: number;
  meetingsSynced: number;
  pendingSync: number;
  failedSync: number;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speakerLabel: string;
  confidence: number | null;
}

export interface ActionItem {
  task: string;
  assignee: string | null;
  dueDate: string | null;
  extracted: boolean;
}

export interface MeetingAnalysis {
  topics: string[];
  questions: string[];
  objections: string[];
  actionItems: ActionItem[];
  keyPoints: string[];
  sentiment: Sentiment | null;
  sentimentScore: number | null;
}

export interface Transcript {
  id: number;
  recordingId: number;
  fullText: string;
  segments: TranscriptSegment[];
  wordCount: number;
  analysis: MeetingAnalysis | null;
  summary: string | null;
  whisperModel: string | null;
  language: string;
  processingTimeMs: number | null;
  createdAt: Date;
}

export interface MeetingSummary {
  overview: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  topics: string[];
  sentiment: Sentiment | null;
}

export interface SummaryPreview {
  summary: MeetingSummary;
  meeting: {
    title: string;
    date: string;
    duration: string;
    attendees: string[];
    companyName: string | null;
  };
}

export interface SendSummaryDto {
  recipientEmails: string[];
  recipientNames?: Record<string, string>;
  includeTranscriptLink?: boolean;
  customMessage?: string;
}

export interface SendSummaryResult {
  sent: string[];
  failed: string[];
}

export interface ScheduleGap {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  precedingMeeting: Meeting | null;
  followingMeeting: Meeting | null;
}

export interface ColdCallSuggestion {
  prospect: Prospect;
  gap: ScheduleGap;
  distanceKm: number;
  estimatedTravelMinutes: number;
  reason: string;
  priority: "high" | "medium" | "low";
  suggestedCallTime: Date;
}

export interface RouteStop {
  type: "prospect" | "meeting" | "current_location";
  id?: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  arrivalTime?: Date;
  departureTime?: Date;
  durationMinutes?: number;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  wazeUrl: string;
  googleMapsUrl: string;
}

export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  speakerLabel: string;
  confidence: number | null;
}

export interface Recording {
  id: number;
  meetingId: number;
  processingStatus: RecordingProcessingStatus;
  originalFilename: string | null;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  sampleRate: number;
  channels: number;
  detectedSpeakersCount: number | null;
  speakerLabels: Record<string, string> | null;
  speakerSegments?: SpeakerSegment[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiateUploadDto {
  meetingId: number;
  filename: string;
  mimeType: string;
  sampleRate?: number;
  channels?: number;
}

export interface InitiateUploadResponse {
  recordingId: number;
  uploadUrl: string;
  uploadMethod: "PUT" | "POST";
  uploadHeaders: Record<string, string> | null;
  expiresAt: Date;
}

export interface CompleteUploadDto {
  fileSizeBytes: number;
  durationSeconds?: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const fieldflowApi = {
  dashboard: async (): Promise<FieldFlowDashboard> => {
    const [prospectsRes, meetingsRes, followUpsRes] = await Promise.all([
      fetch(`${browserBaseUrl}/fieldflow/prospects`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${browserBaseUrl}/fieldflow/meetings/today`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${browserBaseUrl}/fieldflow/prospects/follow-ups`, {
        headers: getAuthHeaders(),
      }),
    ]);

    const prospects = await handleResponse<Prospect[]>(prospectsRes);
    const meetings = await handleResponse<Meeting[]>(meetingsRes);
    const followUps = await handleResponse<Prospect[]>(followUpsRes);

    const activeStatuses: ProspectStatus[] = ["contacted", "qualified", "proposal"];
    const activeProspects = prospects.filter((p) => activeStatuses.includes(p.status));

    return {
      stats: {
        totalProspects: prospects.length,
        activeProspects: activeProspects.length,
        todaysMeetings: meetings.length,
        followUpsDue: followUps.length,
      },
      todaysMeetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        prospectCompany: m.prospect?.companyName ?? null,
        time: new Date(m.scheduledStart).toLocaleTimeString("en-ZA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: m.meetingType,
      })),
    };
  },

  prospects: {
    list: async (): Promise<Prospect[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    listByStatus: async (status: ProspectStatus): Promise<Prospect[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/status/${status}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    detail: async (id: number): Promise<Prospect> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    create: async (dto: CreateProspectDto): Promise<Prospect> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Prospect>(response);
    },

    update: async (id: number, dto: Partial<CreateProspectDto>): Promise<Prospect> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Prospect>(response);
    },

    updateStatus: async (id: number, status: ProspectStatus): Promise<Prospect> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/${id}/status/${status}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    markContacted: async (id: number): Promise<Prospect> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/${id}/contacted`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    nearby: async (
      lat: number,
      lng: number,
      radiusKm?: number,
      limit?: number,
    ): Promise<Prospect[]> => {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
      });
      if (radiusKm) params.set("radiusKm", radiusKm.toString());
      if (limit) params.set("limit", limit.toString());

      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/nearby?${params}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    stats: async (): Promise<Record<ProspectStatus, number>> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/stats`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Record<ProspectStatus, number>>(response);
    },

    followUpsDue: async (): Promise<Prospect[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/prospects/follow-ups`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },
  },

  meetings: {
    list: async (): Promise<Meeting[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    today: async (): Promise<Meeting[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/today`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    upcoming: async (days?: number): Promise<Meeting[]> => {
      const params = days ? `?days=${days}` : "";
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/upcoming${params}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    detail: async (id: number): Promise<Meeting> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Meeting>(response);
    },

    create: async (dto: CreateMeetingDto): Promise<Meeting> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    update: async (id: number, dto: Partial<CreateMeetingDto>): Promise<Meeting> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    start: async (id: number): Promise<Meeting> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/${id}/start`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      return handleResponse<Meeting>(response);
    },

    end: async (id: number, notes?: string, outcomes?: string): Promise<Meeting> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/${id}/end`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes, outcomes }),
      });
      return handleResponse<Meeting>(response);
    },

    cancel: async (id: number): Promise<Meeting> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/${id}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return handleResponse<Meeting>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/meetings/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },
  },

  visits: {
    list: async (): Promise<Visit[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/visits`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Visit[]>(response);
    },

    today: async (): Promise<Visit[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/visits/today`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Visit[]>(response);
    },

    byProspect: async (prospectId: number): Promise<Visit[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/visits/prospect/${prospectId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Visit[]>(response);
    },

    create: async (dto: CreateVisitDto): Promise<Visit> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/visits`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Visit>(response);
    },

    checkIn: async (id: number, latitude: number, longitude: number): Promise<Visit> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/visits/${id}/check-in`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      return handleResponse<Visit>(response);
    },

    checkOut: async (
      id: number,
      latitude: number,
      longitude: number,
      outcome?: VisitOutcome,
      notes?: string,
    ): Promise<Visit> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/visits/${id}/check-out`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude, longitude, outcome, notes }),
      });
      return handleResponse<Visit>(response);
    },
  },

  calendars: {
    oauthUrl: async (provider: CalendarProvider, redirectUri: string): Promise<{ url: string }> => {
      const params = new URLSearchParams({ redirectUri });
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/calendars/oauth-url/${provider}?${params}`,
        { headers: getAuthHeaders() },
      );
      return handleResponse<{ url: string }>(response);
    },

    connect: async (dto: ConnectCalendarDto): Promise<CalendarConnection> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/calendars/connect`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CalendarConnection>(response);
    },

    connections: async (): Promise<CalendarConnection[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/calendars/connections`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<CalendarConnection[]>(response);
    },

    connection: async (id: number): Promise<CalendarConnection> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/calendars/connections/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<CalendarConnection>(response);
    },

    update: async (id: number, dto: UpdateCalendarConnectionDto): Promise<CalendarConnection> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/calendars/connections/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CalendarConnection>(response);
    },

    disconnect: async (id: number): Promise<void> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/calendars/connections/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Disconnect failed" }));
        throw new Error(error.message);
      }
    },

    availableCalendars: async (connectionId: number): Promise<CalendarListItem[]> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/calendars/connections/${connectionId}/calendars`,
        { headers: getAuthHeaders() },
      );
      return handleResponse<CalendarListItem[]>(response);
    },

    sync: async (connectionId: number, fullSync?: boolean): Promise<SyncResult> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/calendars/connections/${connectionId}/sync`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fullSync: fullSync ?? false }),
        },
      );
      return handleResponse<SyncResult>(response);
    },

    events: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${browserBaseUrl}/fieldflow/calendars/events?${params}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<CalendarEvent[]>(response);
    },
  },

  recordings: {
    initiate: async (dto: InitiateUploadDto): Promise<InitiateUploadResponse> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/recordings/initiate`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<InitiateUploadResponse>(response);
    },

    uploadChunk: async (
      recordingId: number,
      chunkIndex: number,
      data: Blob,
    ): Promise<{ chunkIndex: number; bytesReceived: number }> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/recordings/${recordingId}/chunk?index=${chunkIndex}`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/octet-stream",
          },
          body: data,
        },
      );
      return handleResponse<{ chunkIndex: number; bytesReceived: number }>(response);
    },

    complete: async (recordingId: number, dto: CompleteUploadDto): Promise<Recording> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/recordings/${recordingId}/complete`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dto),
        },
      );
      return handleResponse<Recording>(response);
    },

    detail: async (recordingId: number): Promise<Recording> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/recordings/${recordingId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Recording>(response);
    },

    byMeeting: async (meetingId: number): Promise<Recording | null> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/recordings/meeting/${meetingId}`, {
        headers: getAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<Recording>(response);
    },

    updateSpeakerLabels: async (
      recordingId: number,
      speakerLabels: Record<string, string>,
    ): Promise<Recording> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/recordings/${recordingId}/speaker-labels`,
        {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ speakerLabels }),
        },
      );
      return handleResponse<Recording>(response);
    },

    delete: async (recordingId: number): Promise<void> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/recordings/${recordingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },
  },

  transcripts: {
    byRecording: async (recordingId: number): Promise<Transcript | null> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/transcripts/recording/${recordingId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (response.status === 404) return null;
      return handleResponse<Transcript>(response);
    },

    byMeeting: async (meetingId: number): Promise<Transcript | null> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/transcripts/meeting/${meetingId}`, {
        headers: getAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<Transcript>(response);
    },

    transcribe: async (recordingId: number): Promise<Transcript> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/transcripts/recording/${recordingId}/transcribe`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<Transcript>(response);
    },

    retranscribe: async (recordingId: number): Promise<Transcript> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/transcripts/recording/${recordingId}/retranscribe`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<Transcript>(response);
    },

    delete: async (recordingId: number): Promise<void> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/transcripts/recording/${recordingId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },
  },

  summaries: {
    preview: async (meetingId: number): Promise<SummaryPreview> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/summaries/meeting/${meetingId}/preview`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<SummaryPreview>(response);
    },

    generate: async (meetingId: number): Promise<MeetingSummary> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/summaries/meeting/${meetingId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<MeetingSummary>(response);
    },

    send: async (meetingId: number, dto: SendSummaryDto): Promise<SendSummaryResult> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/summaries/meeting/${meetingId}/send`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dto),
        },
      );
      return handleResponse<SendSummaryResult>(response);
    },
  },

  crm: {
    configs: async (): Promise<CrmConfig[]> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<CrmConfig[]>(response);
    },

    config: async (id: number): Promise<CrmConfig> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<CrmConfig>(response);
    },

    create: async (dto: CreateCrmConfigDto): Promise<CrmConfig> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CrmConfig>(response);
    },

    update: async (id: number, dto: UpdateCrmConfigDto): Promise<CrmConfig> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CrmConfig>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    testConnection: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return handleResponse<{ success: boolean; message: string }>(response);
    },

    syncProspect: async (configId: number, prospectId: number): Promise<CrmSyncResult> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/crm/configs/${configId}/sync/prospect/${prospectId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<CrmSyncResult>(response);
    },

    syncMeeting: async (configId: number, meetingId: number): Promise<CrmSyncResult> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/crm/configs/${configId}/sync/meeting/${meetingId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<CrmSyncResult>(response);
    },

    syncAllProspects: async (configId: number): Promise<{ synced: number; failed: number }> => {
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/crm/configs/${configId}/sync/all-prospects`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<{ synced: number; failed: number }>(response);
    },

    syncStatus: async (configId: number): Promise<CrmSyncStatus> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/configs/${configId}/status`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<CrmSyncStatus>(response);
    },

    exportProspectsCsv: async (configId?: number): Promise<Blob> => {
      const params = configId ? `?configId=${configId}` : "";
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/export/prospects${params}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    exportMeetingsCsv: async (configId?: number): Promise<Blob> => {
      const params = configId ? `?configId=${configId}` : "";
      const response = await fetch(`${browserBaseUrl}/fieldflow/crm/export/meetings${params}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },
  },

  routes: {
    scheduleGaps: async (date: string, minGapMinutes?: number): Promise<ScheduleGap[]> => {
      const params = new URLSearchParams({ date });
      if (minGapMinutes) params.set("minGapMinutes", minGapMinutes.toString());
      const response = await fetch(`${browserBaseUrl}/fieldflow/routes/gaps?${params}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<ScheduleGap[]>(response);
    },

    coldCallSuggestions: async (
      date: string,
      currentLat?: number,
      currentLng?: number,
      maxSuggestions?: number,
    ): Promise<ColdCallSuggestion[]> => {
      const params = new URLSearchParams({ date });
      if (currentLat !== undefined) params.set("currentLat", currentLat.toString());
      if (currentLng !== undefined) params.set("currentLng", currentLng.toString());
      if (maxSuggestions) params.set("maxSuggestions", maxSuggestions.toString());
      const response = await fetch(
        `${browserBaseUrl}/fieldflow/routes/cold-call-suggestions?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<ColdCallSuggestion[]>(response);
    },

    optimizeRoute: async (
      startLat: number,
      startLng: number,
      stops: Array<{ id: number; type: "prospect" | "meeting" }>,
      returnToStart?: boolean,
    ): Promise<OptimizedRoute> => {
      const response = await fetch(`${browserBaseUrl}/fieldflow/routes/optimize`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startLat, startLng, stops, returnToStart }),
      });
      return handleResponse<OptimizedRoute>(response);
    },

    planDayRoute: async (
      date: string,
      includeColdCalls?: boolean,
      currentLat?: number,
      currentLng?: number,
    ): Promise<OptimizedRoute> => {
      const params = new URLSearchParams({ date });
      if (includeColdCalls !== undefined)
        params.set("includeColdCalls", includeColdCalls.toString());
      if (currentLat !== undefined) params.set("currentLat", currentLat.toString());
      if (currentLng !== undefined) params.set("currentLng", currentLng.toString());
      const response = await fetch(`${browserBaseUrl}/fieldflow/routes/plan-day?${params}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<OptimizedRoute>(response);
    },
  },
};
