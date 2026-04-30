import { throwIfNotOk } from "@/app/lib/api/apiError";
import { type ApiClient, createApiClient, createEndpoint } from "@/app/lib/api/createApiClient";
import { annixRepTokenStore } from "@/app/lib/api/portalTokenStores";
import { fromJSDate } from "@/app/lib/datetime";
import { API_BASE_URL, annixRepAuthHeaders, browserBaseUrl } from "@/lib/api-config";

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: annixRepTokenStore,
  refreshUrl: `${API_BASE_URL}/annix-rep/auth/refresh`,
});

export interface TargetCustomerProfile {
  businessTypes?: string[];
  companySizes?: string[];
  decisionMakerTitles?: string[];
}

export interface RepProfile {
  id: number;
  userId: number;
  industry: string;
  subIndustries: string[];
  productCategories: string[];
  companyName: string | null;
  jobTitle: string | null;
  territoryDescription: string | null;
  defaultSearchLatitude: number | null;
  defaultSearchLongitude: number | null;
  defaultSearchRadiusKm: number;
  targetCustomerProfile: TargetCustomerProfile | null;
  customSearchTerms: string[] | null;
  setupCompleted: boolean;
  setupCompletedAt: Date | null;
  defaultBufferBeforeMinutes: number;
  defaultBufferAfterMinutes: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRepProfileDto {
  industry: string;
  subIndustries: string[];
  productCategories: string[];
  companyName?: string;
  jobTitle?: string;
  territoryDescription?: string;
  defaultSearchLatitude?: number;
  defaultSearchLongitude?: number;
  defaultSearchRadiusKm?: number;
  targetCustomerProfile?: TargetCustomerProfile;
  customSearchTerms?: string[];
}

export interface UpdateRepProfileDto extends Partial<CreateRepProfileDto> {
  setupCompleted?: boolean;
  defaultBufferBeforeMinutes?: number;
  defaultBufferAfterMinutes?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string;
}

export interface RepProfileStatus {
  setupCompleted: boolean;
  profile: RepProfile | null;
}

export type CalendarProvider = "google" | "outlook" | "apple" | "caldav";
export type CalendarSyncStatus = "active" | "paused" | "error" | "expired";
export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export type ProspectStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ProspectPriority = "low" | "medium" | "high" | "urgent";
export type FollowUpRecurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly";
export type DiscoverySource = "google_places" | "yellow_pages" | "osm";
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
  discoverySource: string | null;
  discoveredAt: Date | null;
  externalId: string | null;
  status: ProspectStatus;
  priority: ProspectPriority;
  notes: string | null;
  tags: string[] | null;
  estimatedValue: number | null;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
  followUpRecurrence: FollowUpRecurrence;
  customFields: Record<string, unknown> | null;
  score: number;
  scoreUpdatedAt: Date | null;
  assignedToId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProspectActivityType =
  | "created"
  | "status_change"
  | "note_added"
  | "follow_up_completed"
  | "follow_up_snoozed"
  | "field_updated"
  | "tag_added"
  | "tag_removed"
  | "merged"
  | "contacted";

export interface ProspectActivity {
  id: number;
  prospectId: number;
  userId: number;
  userName: string | null;
  activityType: ProspectActivityType;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  description: string | null;
  createdAt: Date;
}

export type CustomFieldType = "text" | "number" | "date" | "select" | "multiselect" | "boolean";

export interface CustomFieldDefinition {
  id: number;
  userId: number;
  name: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  options: string[] | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFieldDto {
  name: string;
  fieldKey: string;
  fieldType?: CustomFieldType;
  isRequired?: boolean;
  options?: string[];
  displayOrder?: number;
}

export interface UpdateCustomFieldDto extends Partial<CreateCustomFieldDto> {
  isActive?: boolean;
}

export interface MergeProspectsDto {
  primaryId: number;
  mergeIds: number[];
  fieldOverrides?: Partial<CreateProspectDto>;
}

export interface BulkTagOperationDto {
  ids: number[];
  tags: string[];
  operation: "add" | "remove";
}

export interface BulkTagOperationResponse {
  updated: number;
  updatedIds: number[];
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
  followUpRecurrence?: FollowUpRecurrence;
  customFields?: Record<string, unknown>;
}

export interface BulkUpdateStatusResponse {
  updated: number;
  updatedIds: number[];
  notFoundIds: number[];
}

export interface BulkDeleteResponse {
  deleted: number;
  deletedIds: number[];
  notFoundIds: number[];
}

export interface DuplicateProspects {
  field: string;
  value: string;
  prospects: Prospect[];
}

export interface ImportProspectRow {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactTitle?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  status?: string;
  priority?: string;
  notes?: string;
  tags?: string;
  estimatedValue?: string;
}

export interface ImportProspectsResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  createdIds: number[];
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
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurringParentId: number | null;
  recurrenceExceptionDates: string | null;
  createdAt: Date;
  updatedAt: Date;
  prospect?: Prospect | null;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurrenceEndType = "never" | "count" | "until";
export type RecurrenceUpdateScope = "this" | "future" | "all";

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval?: number;
  byWeekDay?: number[];
  byMonthDay?: number;
  endType: RecurrenceEndType;
  count?: number;
  until?: string;
}

export interface CreateRecurringMeetingDto extends CreateMeetingDto {
  recurrence: RecurrenceOptions;
}

export interface UpdateRecurringMeetingDto extends Partial<CreateMeetingDto> {
  scope: RecurrenceUpdateScope;
  status?: MeetingStatus;
  notes?: string;
  outcomes?: string;
}

export interface DeleteRecurringMeetingDto {
  scope: RecurrenceUpdateScope;
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

export interface RescheduleMeetingDto {
  scheduledStart: string;
  scheduledEnd: string;
  rescheduleReason?: string;
}

export interface AnnixRepDashboard {
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
  displayColor: string;
  createdAt: Date;
}

export type CalendarColorType = "meeting_type" | "status" | "calendar";

export interface CalendarColorScheme {
  meetingTypes: Record<string, string>;
  statuses: Record<string, string>;
  calendars: Record<number, string>;
}

export const DEFAULT_MEETING_TYPE_COLORS: Record<string, string> = {
  in_person: "#10B981",
  phone: "#6366F1",
  video: "#F59E0B",
};

export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  scheduled: "#3B82F6",
  in_progress: "#EAB308",
  completed: "#22C55E",
  cancelled: "#6B7280",
  no_show: "#EF4444",
};

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

export type ConflictType =
  | "time_overlap"
  | "data_conflict"
  | "deleted_locally"
  | "deleted_remotely";
export type ConflictResolution = "pending" | "keep_local" | "keep_remote" | "merged" | "dismissed";

export interface ConflictData {
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  [key: string]: unknown;
}

export interface SyncConflict {
  id: number;
  userId: number;
  meetingId: number | null;
  calendarEventId: number | null;
  conflictType: ConflictType;
  localData: ConflictData;
  remoteData: ConflictData;
  resolution: ConflictResolution;
  resolvedAt: Date | null;
  createdAt: Date;
  meeting?: Meeting | null;
  calendarEvent?: CalendarEvent | null;
}

export interface ResolveConflictDto {
  resolution: "keep_local" | "keep_remote" | "dismissed";
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
  isConnected: boolean;
  webhookConfig: WebhookConfig | null;
  instanceUrl: string | null;
  crmUserId: string | null;
  crmOrganizationId: string | null;
  tokenExpiresAt: Date | null;
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

export type CrmProvider = "salesforce" | "hubspot" | "pipedrive";

export type SyncDirection = "push" | "pull";
export type SyncLogStatus = "in_progress" | "completed" | "failed" | "partial";

export interface SyncErrorDetail {
  recordId: string | number;
  recordType: string;
  error: string;
  timestamp: string;
}

export interface CrmSyncLog {
  id: number;
  configId: number;
  direction: SyncDirection;
  status: SyncLogStatus;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorDetails: SyncErrorDetail[] | null;
  startedAt: Date;
  completedAt: Date | null;
}

export type TeamsBotSessionStatus = "joining" | "active" | "leaving" | "ended" | "failed";

export interface TeamsBotParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface TeamsBotTranscriptEntry {
  timestamp: string;
  speakerId: string | null;
  speakerName: string;
  text: string;
  confidence: number;
}

export interface TeamsBotSession {
  id: number;
  sessionId: string;
  userId: number;
  meetingId: number | null;
  meetingUrl: string;
  status: TeamsBotSessionStatus;
  botDisplayName: string;
  errorMessage: string | null;
  participants: TeamsBotParticipant[] | null;
  participantCount: number;
  transcriptEntryCount: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface TeamsBotTranscript {
  sessionId: string;
  entries: TeamsBotTranscriptEntry[];
  totalCount: number;
}

export interface JoinTeamsMeetingDto {
  meetingUrl: string;
  meetingId?: number;
  botDisplayName?: string;
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

export interface UpdateTranscriptSegmentDto {
  index: number;
  speakerLabel?: string;
  text?: string;
}

export interface UpdateTranscriptDto {
  segments: UpdateTranscriptSegmentDto[];
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

export interface TravelInfo {
  distanceKm: number;
  estimatedMinutes: number;
}

export interface ScheduleGap {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  precedingMeeting: Meeting | null;
  followingMeeting: Meeting | null;
  travelFromPrevious: TravelInfo | null;
  travelToNext: TravelInfo | null;
  effectiveAvailableMinutes: number;
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

export interface AnalyticsSummary {
  totalProspects: number;
  activeProspects: number;
  totalMeetings: number;
  completedMeetings: number;
  totalVisits: number;
  totalPipelineValue: number;
  avgDealCycledays: number | null;
  winRate: number | null;
}

export interface MeetingsOverTime {
  period: string;
  count: number;
  completed: number;
  cancelled: number;
}

export interface ProspectFunnel {
  status: ProspectStatus;
  count: number;
  totalValue: number;
}

export interface WinLossRateTrend {
  period: string;
  won: number;
  lost: number;
  winRate: number;
}

export interface ActivityHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface RevenuePipeline {
  status: ProspectStatus;
  count: number;
  totalValue: number;
  avgValue: number;
}

export interface TopProspect {
  id: number;
  companyName: string;
  contactName: string | null;
  status: ProspectStatus;
  estimatedValue: number;
  lastContactedAt: Date | null;
}

export type GoalPeriod = "weekly" | "monthly" | "quarterly";

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface WeeklyActivityReport {
  period: ReportDateRange;
  summary: {
    totalMeetings: number;
    completedMeetings: number;
    cancelledMeetings: number;
    totalVisits: number;
    successfulVisits: number;
    newProspects: number;
    contactedProspects: number;
    dealsWon: number;
    dealsLost: number;
    revenueWon: number;
  };
  meetingsByDay: Array<{ date: string; count: number; completed: number }>;
  visitsByDay: Array<{ date: string; count: number; successful: number }>;
  prospectStatusChanges: Array<{
    prospectId: number;
    companyName: string;
    fromStatus: string;
    toStatus: string;
    date: string;
  }>;
}

export interface MonthlySalesReport {
  period: ReportDateRange;
  summary: {
    totalRevenue: number;
    dealsClosed: number;
    averageDealSize: number;
    winRate: number;
    pipelineValue: number;
    meetingsHeld: number;
    visitsCompleted: number;
    newProspectsAdded: number;
  };
  revenueByWeek: Array<{ week: string; revenue: number; deals: number }>;
  prospectsByStatus: Array<{ status: string; count: number; value: number }>;
  topDeals: Array<{
    prospectId: number;
    companyName: string;
    value: number;
    closedDate: string;
  }>;
}

export interface TerritoryCoverageReport {
  period: ReportDateRange;
  bounds: { north: number; south: number; east: number; west: number };
  prospects: Array<{
    id: number;
    companyName: string;
    latitude: number;
    longitude: number;
    status: string;
    lastVisitDate: string | null;
    visitCount: number;
  }>;
  visits: Array<{
    id: number;
    prospectId: number;
    latitude: number;
    longitude: number;
    date: string;
    outcome: string | null;
  }>;
  coverage: {
    totalProspectsWithLocation: number;
    visitedProspects: number;
    coveragePercentage: number;
  };
}

export interface MeetingOutcomesReport {
  period: ReportDateRange;
  summary: {
    totalMeetings: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    averageDurationMinutes: number | null;
  };
  outcomesByType: Array<{
    meetingType: string;
    total: number;
    completed: number;
    cancelled: number;
  }>;
  detailedMeetings: Array<{
    id: number;
    title: string;
    prospectName: string | null;
    scheduledDate: string;
    status: string;
    duration: number | null;
    outcomes: string | null;
  }>;
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

export interface BookingLink {
  id: number;
  userId: number;
  slug: string;
  name: string;
  meetingDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  availableDays: string;
  availableStartHour: number;
  availableEndHour: number;
  maxDaysAhead: number;
  isActive: boolean;
  customQuestions: CustomQuestion[] | null;
  meetingType: MeetingType;
  location: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  bookingUrl: string;
}

export interface CreateBookingLinkDto {
  name: string;
  meetingDurationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  availableDays?: string;
  availableStartHour?: number;
  availableEndHour?: number;
  maxDaysAhead?: number;
  customQuestions?: CustomQuestion[];
  meetingType?: MeetingType;
  location?: string;
  description?: string;
}

export interface UpdateBookingLinkDto extends Partial<CreateBookingLinkDto> {
  isActive?: boolean;
}

export interface PublicBookingLink {
  slug: string;
  name: string;
  meetingDurationMinutes: number;
  availableDays: string;
  availableStartHour: number;
  availableEndHour: number;
  maxDaysAhead: number;
  customQuestions: CustomQuestion[] | null;
  meetingType: MeetingType;
  location: string | null;
  description: string | null;
  hostName: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

export interface BookSlotDto {
  startTime: string;
  name: string;
  email: string;
  notes?: string;
  customAnswers?: Record<string, string>;
}

export interface BookingConfirmation {
  meetingId: number;
  title: string;
  startTime: string;
  endTime: string;
  meetingType: MeetingType;
  location: string | null;
  hostName: string;
  hostEmail: string;
}

export interface SalesGoal {
  id: number;
  userId: number;
  period: GoalPeriod;
  meetingsTarget: number | null;
  visitsTarget: number | null;
  newProspectsTarget: number | null;
  revenueTarget: number | null;
  dealsWonTarget: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalDto {
  period: GoalPeriod;
  meetingsTarget?: number | null;
  visitsTarget?: number | null;
  newProspectsTarget?: number | null;
  revenueTarget?: number | null;
  dealsWonTarget?: number | null;
}

export interface UpdateGoalDto {
  meetingsTarget?: number | null;
  visitsTarget?: number | null;
  newProspectsTarget?: number | null;
  revenueTarget?: number | null;
  dealsWonTarget?: number | null;
  isActive?: boolean;
}

export interface GoalMetric {
  target: number | null;
  actual: number;
  percentage: number | null;
}

export interface GoalProgress {
  period: GoalPeriod;
  periodStart: string;
  periodEnd: string;
  meetings: GoalMetric;
  visits: GoalMetric;
  newProspects: GoalMetric;
  revenue: GoalMetric;
  dealsWon: GoalMetric;
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

export interface DiscoverProspectsDto {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  sources?: DiscoverySource[];
  searchTerms?: string[];
}

export interface DiscoveredBusiness {
  source: DiscoverySource;
  externalId: string;
  companyName: string;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  businessTypes: string[];
  rating: number | null;
  userRatingsTotal: number | null;
}

export interface DiscoverySearchResult {
  discovered: DiscoveredBusiness[];
  existingMatches: number;
  totalFound: number;
  sourcesQueried: string[];
}

export interface DiscoveryImportResult {
  created: number;
  duplicates: number;
  createdIds: number[];
}

export interface DiscoveryQuota {
  googleDailyLimit: number;
  googleUsedToday: number;
  googleRemaining: number;
  lastResetAt: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  await throwIfNotOk(response);
  return response.json();
}

export const annixRepApi = {
  dashboard: async (): Promise<AnnixRepDashboard> => {
    const [prospectsRes, meetingsRes, followUpsRes] = await Promise.all([
      fetch(`${browserBaseUrl()}/annix-rep/prospects`, {
        headers: annixRepAuthHeaders(),
      }),
      fetch(`${browserBaseUrl()}/annix-rep/meetings/today`, {
        headers: annixRepAuthHeaders(),
      }),
      fetch(`${browserBaseUrl()}/annix-rep/prospects/follow-ups`, {
        headers: annixRepAuthHeaders(),
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
      todaysMeetings: meetings.map((m) => {
        const rawCompanyName = m.prospect?.companyName;

        return {
          id: m.id,
          title: m.title,
          prospectCompany: rawCompanyName || null,

          time: fromJSDate(m.scheduledStart).toJSDate().toLocaleTimeString("en-ZA", {
            hour: "2-digit",
            minute: "2-digit",
          }),

          type: m.meetingType,
        };
      }),
    };
  },

  prospects: {
    list: createEndpoint<[], Prospect[]>(apiClient, "GET", {
      path: "/annix-rep/prospects",
    }),

    listByStatus: createEndpoint<[status: ProspectStatus], Prospect[]>(apiClient, "GET", {
      path: (status) => `/annix-rep/prospects/status/${status}`,
    }),

    detail: createEndpoint<[id: number], Prospect>(apiClient, "GET", {
      path: (id) => `/annix-rep/prospects/${id}`,
    }),

    create: createEndpoint<[dto: CreateProspectDto], Prospect>(apiClient, "POST", {
      path: "/annix-rep/prospects",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: Partial<CreateProspectDto>], Prospect>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/prospects/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    updateStatus: createEndpoint<[id: number, status: ProspectStatus], Prospect>(
      apiClient,
      "PATCH",
      {
        path: (id, status) => `/annix-rep/prospects/${id}/status/${status}`,
      },
    ),

    markContacted: createEndpoint<[id: number], Prospect>(apiClient, "POST", {
      path: (id) => `/annix-rep/prospects/${id}/contacted`,
    }),

    completeFollowUp: createEndpoint<[id: number], Prospect>(apiClient, "POST", {
      path: (id) => `/annix-rep/prospects/${id}/complete-followup`,
    }),

    snoozeFollowUp: createEndpoint<[id: number, days: number], Prospect>(apiClient, "POST", {
      path: (id, _days) => `/annix-rep/prospects/${id}/snooze-followup`,
      body: (_id, days) => ({ days }),
    }),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/prospects/${id}`,
    }),

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

      const response = await fetch(`${browserBaseUrl()}/annix-rep/prospects/nearby?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    stats: async (): Promise<Record<ProspectStatus, number>> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/prospects/stats`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Record<ProspectStatus, number>>(response);
    },

    followUpsDue: createEndpoint<[], Prospect[]>(apiClient, "GET", {
      path: "/annix-rep/prospects/follow-ups",
    }),

    bulkUpdateStatus: createEndpoint<
      [ids: number[], status: ProspectStatus],
      BulkUpdateStatusResponse
    >(apiClient, "PATCH", {
      path: "/annix-rep/prospects/bulk/status",
      body: (ids, status) => ({ ids, status }),
    }),

    bulkDelete: async (ids: number[]): Promise<BulkDeleteResponse> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/prospects/bulk`, {
        method: "DELETE",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
      return handleResponse<BulkDeleteResponse>(response);
    },

    exportCsv: createEndpoint<[], Blob>(apiClient, "GET", {
      path: "/annix-rep/prospects/export/csv",
      responseType: "blob",
    }),

    duplicates: createEndpoint<[], DuplicateProspects[]>(apiClient, "GET", {
      path: "/annix-rep/prospects/duplicates",
    }),

    import: async (
      rows: ImportProspectRow[],
      skipInvalid = true,
    ): Promise<ImportProspectsResult> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/prospects/import`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows, skipInvalid }),
      });
      return handleResponse<ImportProspectsResult>(response);
    },

    merge: createEndpoint<[dto: MergeProspectsDto], Prospect>(apiClient, "POST", {
      path: "/annix-rep/prospects/merge",
      body: (dto) => dto,
    }),

    bulkTagOperation: createEndpoint<[dto: BulkTagOperationDto], BulkTagOperationResponse>(
      apiClient,
      "PATCH",
      {
        path: "/annix-rep/prospects/bulk/tags",
        body: (dto) => dto,
      },
    ),

    bulkAssign: createEndpoint<
      [ids: number[], assignedToId: number | null],
      { updated: number; updatedIds: number[] }
    >(apiClient, "PATCH", {
      path: "/annix-rep/prospects/bulk/assign",
      body: (ids, assignedToId) => ({ ids, assignedToId }),
    }),

    recalculateScores: createEndpoint<[], { updated: number }>(apiClient, "POST", {
      path: "/annix-rep/prospects/recalculate-scores",
    }),

    activities: async (id: number, limit?: number): Promise<ProspectActivity[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/prospects/${id}/activities${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<ProspectActivity[]>(response);
    },
  },

  customFields: {
    list: async (includeInactive = false): Promise<CustomFieldDefinition[]> => {
      const params = includeInactive ? "?includeInactive=true" : "";
      const response = await fetch(`${browserBaseUrl()}/annix-rep/custom-fields${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CustomFieldDefinition[]>(response);
    },

    detail: createEndpoint<[id: number], CustomFieldDefinition>(apiClient, "GET", {
      path: (id) => `/annix-rep/custom-fields/${id}`,
    }),

    create: createEndpoint<[dto: CreateCustomFieldDto], CustomFieldDefinition>(apiClient, "POST", {
      path: "/annix-rep/custom-fields",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: UpdateCustomFieldDto], CustomFieldDefinition>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/custom-fields/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/custom-fields/${id}`,
    }),

    reorder: createEndpoint<[orderedIds: number[]], CustomFieldDefinition[]>(apiClient, "POST", {
      path: "/annix-rep/custom-fields/reorder",
      body: (orderedIds) => ({ orderedIds }),
    }),
  },

  meetings: {
    list: createEndpoint<[], Meeting[]>(apiClient, "GET", {
      path: "/annix-rep/meetings",
    }),

    today: createEndpoint<[], Meeting[]>(apiClient, "GET", {
      path: "/annix-rep/meetings/today",
    }),

    upcoming: async (days?: number): Promise<Meeting[]> => {
      const params = days ? `?days=${days}` : "";
      const response = await fetch(`${browserBaseUrl()}/annix-rep/meetings/upcoming${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    detail: createEndpoint<[id: number], Meeting>(apiClient, "GET", {
      path: (id) => `/annix-rep/meetings/${id}`,
    }),

    create: createEndpoint<[dto: CreateMeetingDto], Meeting>(apiClient, "POST", {
      path: "/annix-rep/meetings",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: Partial<CreateMeetingDto>], Meeting>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/meetings/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    start: createEndpoint<[id: number], Meeting>(apiClient, "POST", {
      path: (id) => `/annix-rep/meetings/${id}/start`,
      body: (_id) => ({}),
    }),

    end: createEndpoint<[id: number, notes?: string, outcomes?: string], Meeting>(
      apiClient,
      "POST",
      {
        path: (id, _notes, _outcomes) => `/annix-rep/meetings/${id}/end`,
        body: (_id, notes, outcomes) => ({ notes, outcomes }),
      },
    ),

    cancel: createEndpoint<[id: number], Meeting>(apiClient, "POST", {
      path: (id) => `/annix-rep/meetings/${id}/cancel`,
    }),

    reschedule: createEndpoint<[id: number, dto: RescheduleMeetingDto], Meeting>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/meetings/${id}/reschedule`,
        body: (_id, dto) => dto,
      },
    ),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/meetings/${id}`,
    }),

    createRecurring: createEndpoint<[dto: CreateRecurringMeetingDto], Meeting>(apiClient, "POST", {
      path: "/annix-rep/meetings/recurring",
      body: (dto) => dto,
    }),

    expandedRecurring: async (startDate: string, endDate: string): Promise<Meeting[]> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/meetings/recurring/expanded?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<Meeting[]>(response);
    },

    seriesInstances: createEndpoint<[parentId: number], Meeting[]>(apiClient, "GET", {
      path: (parentId) => `/annix-rep/meetings/recurring/${parentId}/instances`,
    }),

    updateRecurring: createEndpoint<[id: number, dto: UpdateRecurringMeetingDto], Meeting>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/meetings/recurring/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    deleteRecurring: async (id: number, dto: DeleteRecurringMeetingDto): Promise<void> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/meetings/recurring/${id}`, {
        method: "DELETE",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      await throwIfNotOk(response);
    },
  },

  visits: {
    list: createEndpoint<[], Visit[]>(apiClient, "GET", {
      path: "/annix-rep/visits",
    }),

    today: createEndpoint<[], Visit[]>(apiClient, "GET", {
      path: "/annix-rep/visits/today",
    }),

    byProspect: createEndpoint<[prospectId: number], Visit[]>(apiClient, "GET", {
      path: (prospectId) => `/annix-rep/visits/prospect/${prospectId}`,
    }),

    create: createEndpoint<[dto: CreateVisitDto], Visit>(apiClient, "POST", {
      path: "/annix-rep/visits",
      body: (dto) => dto,
    }),

    checkIn: createEndpoint<[id: number, latitude: number, longitude: number], Visit>(
      apiClient,
      "POST",
      {
        path: (id, _latitude, _longitude) => `/annix-rep/visits/${id}/check-in`,
        body: (_id, latitude, longitude) => ({ latitude, longitude }),
      },
    ),

    checkOut: createEndpoint<
      [id: number, latitude: number, longitude: number, outcome?: VisitOutcome, notes?: string],
      Visit
    >(apiClient, "POST", {
      path: (id, _latitude, _longitude, _outcome, _notes) => `/annix-rep/visits/${id}/check-out`,
      body: (_id, latitude, longitude, outcome, notes) => ({ latitude, longitude, outcome, notes }),
    }),
  },

  calendars: {
    oauthUrl: async (provider: CalendarProvider, redirectUri: string): Promise<{ url: string }> => {
      const params = new URLSearchParams({ redirectUri });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/calendars/oauth-url/${provider}?${params}`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<{ url: string }>(response);
    },

    connect: createEndpoint<[dto: ConnectCalendarDto], CalendarConnection>(apiClient, "POST", {
      path: "/annix-rep/calendars/connect",
      body: (dto) => dto,
    }),

    connections: createEndpoint<[], CalendarConnection[]>(apiClient, "GET", {
      path: "/annix-rep/calendars/connections",
    }),

    connection: createEndpoint<[id: number], CalendarConnection>(apiClient, "GET", {
      path: (id) => `/annix-rep/calendars/connections/${id}`,
    }),

    update: createEndpoint<[id: number, dto: UpdateCalendarConnectionDto], CalendarConnection>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/calendars/connections/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    disconnect: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/calendars/connections/${id}`,
    }),

    availableCalendars: createEndpoint<[connectionId: number], CalendarListItem[]>(
      apiClient,
      "GET",
      {
        path: (connectionId) => `/annix-rep/calendars/connections/${connectionId}/calendars`,
      },
    ),

    sync: createEndpoint<[connectionId: number, fullSync?: boolean], SyncResult>(
      apiClient,
      "POST",
      {
        path: (connectionId, _fullSync) => `/annix-rep/calendars/connections/${connectionId}/sync`,
        body: (_connectionId, fullSync) => ({ fullSync: fullSync ?? false }),
      },
    ),

    events: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${browserBaseUrl()}/annix-rep/calendars/events?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CalendarEvent[]>(response);
    },

    colors: createEndpoint<[], CalendarColorScheme>(apiClient, "GET", {
      path: "/annix-rep/calendars/colors",
    }),

    setColors: createEndpoint<
      [colors: Array<{ colorType: CalendarColorType; colorKey: string; colorValue: string }>],
      { success: boolean }
    >(apiClient, "POST", {
      path: "/annix-rep/calendars/colors",
      body: (colors) => ({ colors }),
    }),

    setColor: createEndpoint<
      [colorType: CalendarColorType, colorKey: string, colorValue: string],
      void
    >(apiClient, "PATCH", {
      path: (colorType, colorKey, _colorValue) =>
        `/annix-rep/calendars/colors/${colorType}/${colorKey}`,
      body: (_colorType, _colorKey, colorValue) => ({ colorValue }),
    }),

    resetColors: async (colorType?: CalendarColorType): Promise<{ success: boolean }> => {
      const params = colorType ? `?colorType=${colorType}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/calendars/colors/reset${params}`,
        {
          method: "DELETE",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<{ success: boolean }>(response);
    },

    conflicts: createEndpoint<[], SyncConflict[]>(apiClient, "GET", {
      path: "/annix-rep/calendars/conflicts",
    }),

    conflictCount: createEndpoint<[], { count: number }>(apiClient, "GET", {
      path: "/annix-rep/calendars/conflicts/count",
    }),

    conflict: createEndpoint<[id: number], SyncConflict>(apiClient, "GET", {
      path: (id) => `/annix-rep/calendars/conflicts/${id}`,
    }),

    resolveConflict: createEndpoint<
      [id: number, resolution: "keep_local" | "keep_remote" | "dismissed"],
      SyncConflict
    >(apiClient, "POST", {
      path: (id, _resolution) => `/annix-rep/calendars/conflicts/${id}/resolve`,
      body: (_id, resolution) => ({ resolution }),
    }),

    detectConflicts: createEndpoint<[], { detected: number }>(apiClient, "POST", {
      path: "/annix-rep/calendars/conflicts/detect",
    }),
  },

  recordings: {
    initiate: createEndpoint<[dto: InitiateUploadDto], InitiateUploadResponse>(apiClient, "POST", {
      path: "/annix-rep/recordings/initiate",
      body: (dto) => dto,
    }),

    uploadChunk: async (
      recordingId: number,
      chunkIndex: number,
      data: Blob,
    ): Promise<{ chunkIndex: number; bytesReceived: number }> => {
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/recordings/${recordingId}/chunk?index=${chunkIndex}`,
        {
          method: "POST",
          headers: {
            ...annixRepAuthHeaders(),
            "Content-Type": "application/octet-stream",
          },
          body: data,
        },
      );
      return handleResponse<{ chunkIndex: number; bytesReceived: number }>(response);
    },

    complete: createEndpoint<[recordingId: number, dto: CompleteUploadDto], Recording>(
      apiClient,
      "POST",
      {
        path: (recordingId, _dto) => `/annix-rep/recordings/${recordingId}/complete`,
        body: (_recordingId, dto) => dto,
      },
    ),

    detail: createEndpoint<[recordingId: number], Recording>(apiClient, "GET", {
      path: (recordingId) => `/annix-rep/recordings/${recordingId}`,
    }),

    byMeeting: async (meetingId: number): Promise<Recording | null> => {
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/recordings/meeting/${meetingId}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (response.status === 404) return null;
      return handleResponse<Recording>(response);
    },

    updateSpeakerLabels: createEndpoint<
      [recordingId: number, speakerLabels: Record<string, string>],
      Recording
    >(apiClient, "PATCH", {
      path: (recordingId, _speakerLabels) => `/annix-rep/recordings/${recordingId}/speaker-labels`,
      body: (_recordingId, speakerLabels) => ({ speakerLabels }),
    }),

    delete: createEndpoint<[recordingId: number], void>(apiClient, "DELETE", {
      path: (recordingId) => `/annix-rep/recordings/${recordingId}`,
    }),

    streamUrl: (recordingId: number): string | null => {
      // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
      if (typeof window === "undefined") return null;
      const token = localStorage.getItem("annixRepAccessToken");
      if (!token) return null;
      return `${browserBaseUrl()}/annix-rep/recordings/${recordingId}/stream?token=${encodeURIComponent(token)}`;
    },
  },

  transcripts: {
    byRecording: async (recordingId: number): Promise<Transcript | null> => {
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/transcripts/recording/${recordingId}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (response.status === 404) return null;
      return handleResponse<Transcript>(response);
    },

    byMeeting: async (meetingId: number): Promise<Transcript | null> => {
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/transcripts/meeting/${meetingId}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (response.status === 404) return null;
      return handleResponse<Transcript>(response);
    },

    transcribe: createEndpoint<[recordingId: number], Transcript>(apiClient, "POST", {
      path: (recordingId) => `/annix-rep/transcripts/recording/${recordingId}/transcribe`,
    }),

    retranscribe: createEndpoint<[recordingId: number], Transcript>(apiClient, "POST", {
      path: (recordingId) => `/annix-rep/transcripts/recording/${recordingId}/retranscribe`,
    }),

    update: createEndpoint<[transcriptId: number, dto: UpdateTranscriptDto], Transcript>(
      apiClient,
      "PATCH",
      {
        path: (transcriptId, _dto) => `/annix-rep/transcripts/${transcriptId}`,
        body: (_transcriptId, dto) => dto,
      },
    ),

    delete: createEndpoint<[recordingId: number], void>(apiClient, "DELETE", {
      path: (recordingId) => `/annix-rep/transcripts/recording/${recordingId}`,
    }),
  },

  summaries: {
    preview: createEndpoint<[meetingId: number], SummaryPreview>(apiClient, "GET", {
      path: (meetingId) => `/annix-rep/summaries/meeting/${meetingId}/preview`,
    }),

    generate: createEndpoint<[meetingId: number], MeetingSummary>(apiClient, "GET", {
      path: (meetingId) => `/annix-rep/summaries/meeting/${meetingId}`,
    }),

    send: createEndpoint<[meetingId: number, dto: SendSummaryDto], SendSummaryResult>(
      apiClient,
      "POST",
      {
        path: (meetingId, _dto) => `/annix-rep/summaries/meeting/${meetingId}/send`,
        body: (_meetingId, dto) => dto,
      },
    ),
  },

  crm: {
    configs: createEndpoint<[], CrmConfig[]>(apiClient, "GET", {
      path: "/annix-rep/crm/configs",
    }),

    config: createEndpoint<[id: number], CrmConfig>(apiClient, "GET", {
      path: (id) => `/annix-rep/crm/configs/${id}`,
    }),

    create: createEndpoint<[dto: CreateCrmConfigDto], CrmConfig>(apiClient, "POST", {
      path: "/annix-rep/crm/configs",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: UpdateCrmConfigDto], CrmConfig>(apiClient, "PATCH", {
      path: (id, _dto) => `/annix-rep/crm/configs/${id}`,
      body: (_id, dto) => dto,
    }),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/crm/configs/${id}`,
    }),

    testConnection: createEndpoint<[id: number], { success: boolean; message: string }>(
      apiClient,
      "POST",
      {
        path: (id) => `/annix-rep/crm/configs/${id}/test`,
      },
    ),

    syncProspect: createEndpoint<[configId: number, prospectId: number], CrmSyncResult>(
      apiClient,
      "POST",
      {
        path: (configId, prospectId) =>
          `/annix-rep/crm/configs/${configId}/sync/prospect/${prospectId}`,
      },
    ),

    syncMeeting: createEndpoint<[configId: number, meetingId: number], CrmSyncResult>(
      apiClient,
      "POST",
      {
        path: (configId, meetingId) =>
          `/annix-rep/crm/configs/${configId}/sync/meeting/${meetingId}`,
      },
    ),

    syncAllProspects: createEndpoint<[configId: number], { synced: number; failed: number }>(
      apiClient,
      "POST",
      {
        path: (configId) => `/annix-rep/crm/configs/${configId}/sync/all-prospects`,
      },
    ),

    syncStatus: createEndpoint<[configId: number], CrmSyncStatus>(apiClient, "GET", {
      path: (configId) => `/annix-rep/crm/configs/${configId}/status`,
    }),

    exportProspectsCsv: async (configId?: number): Promise<Blob> => {
      const params = configId ? `?configId=${configId}` : "";
      const response = await fetch(`${browserBaseUrl()}/annix-rep/crm/export/prospects${params}`, {
        headers: annixRepAuthHeaders(),
      });
      await throwIfNotOk(response);
      return response.blob();
    },

    exportMeetingsCsv: async (configId?: number): Promise<Blob> => {
      const params = configId ? `?configId=${configId}` : "";
      const response = await fetch(`${browserBaseUrl()}/annix-rep/crm/export/meetings${params}`, {
        headers: annixRepAuthHeaders(),
      });
      await throwIfNotOk(response);
      return response.blob();
    },

    oauthUrl: async (provider: CrmProvider, redirectUri: string): Promise<{ url: string }> => {
      const params = new URLSearchParams({ redirectUri });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/crm/oauth/${provider}/url?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<{ url: string }>(response);
    },

    oauthCallback: async (
      provider: CrmProvider,
      code: string,
      redirectUri: string,
    ): Promise<CrmConfig> => {
      const params = new URLSearchParams({ code, redirectUri });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/crm/oauth/${provider}/callback?${params}`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<CrmConfig>(response);
    },

    disconnect: createEndpoint<[configId: number], { success: boolean }>(apiClient, "POST", {
      path: (configId) => `/annix-rep/crm/configs/${configId}/disconnect`,
    }),

    syncNow: createEndpoint<[configId: number], CrmSyncLog>(apiClient, "POST", {
      path: (configId) => `/annix-rep/crm/configs/${configId}/sync-now`,
    }),

    pullAll: createEndpoint<[configId: number], CrmSyncLog>(apiClient, "POST", {
      path: (configId) => `/annix-rep/crm/configs/${configId}/pull-all`,
    }),

    syncLogs: async (
      configId: number,
      limit?: number,
      offset?: number,
    ): Promise<{ logs: CrmSyncLog[]; total: number }> => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", limit.toString());
      if (offset) params.set("offset", offset.toString());
      const query = params.toString() ? `?${params}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/crm/configs/${configId}/sync-logs${query}`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<{ logs: CrmSyncLog[]; total: number }>(response);
    },

    refreshToken: createEndpoint<[configId: number], { success: boolean }>(apiClient, "POST", {
      path: (configId) => `/annix-rep/crm/configs/${configId}/refresh-token`,
    }),
  },

  routes: {
    scheduleGaps: async (date: string, minGapMinutes?: number): Promise<ScheduleGap[]> => {
      const params = new URLSearchParams({ date });
      if (minGapMinutes) params.set("minGapMinutes", minGapMinutes.toString());
      const response = await fetch(`${browserBaseUrl()}/annix-rep/routes/gaps?${params}`, {
        headers: annixRepAuthHeaders(),
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
        `${browserBaseUrl()}/annix-rep/routes/cold-call-suggestions?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<ColdCallSuggestion[]>(response);
    },

    optimizeRoute: createEndpoint<
      [
        startLat: number,
        startLng: number,
        stops: Array<{ id: number; type: "prospect" | "meeting" }>,
        returnToStart?: boolean,
      ],
      OptimizedRoute
    >(apiClient, "POST", {
      path: "/annix-rep/routes/optimize",
      body: (startLat, startLng, stops, returnToStart) => ({
        startLat,
        startLng,
        stops,
        returnToStart,
      }),
    }),

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
      const response = await fetch(`${browserBaseUrl()}/annix-rep/routes/plan-day?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<OptimizedRoute>(response);
    },
  },

  repProfile: {
    status: createEndpoint<[], RepProfileStatus>(apiClient, "GET", {
      path: "/annix-rep/rep-profile/status",
    }),

    profile: async (): Promise<RepProfile | null> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/rep-profile`, {
        headers: annixRepAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<RepProfile>(response);
    },

    create: createEndpoint<[dto: CreateRepProfileDto], RepProfile>(apiClient, "POST", {
      path: "/annix-rep/rep-profile",
      body: (dto) => dto,
    }),

    update: createEndpoint<[dto: UpdateRepProfileDto], RepProfile>(apiClient, "PATCH", {
      path: "/annix-rep/rep-profile",
      body: (dto) => dto,
    }),

    completeSetup: createEndpoint<[], RepProfile>(apiClient, "POST", {
      path: "/annix-rep/rep-profile/complete-setup",
    }),

    searchTerms: createEndpoint<[], string[]>(apiClient, "GET", {
      path: "/annix-rep/rep-profile/search-terms",
    }),
  },

  analytics: {
    summary: createEndpoint<[], AnalyticsSummary>(apiClient, "GET", {
      path: "/annix-rep/analytics/summary",
    }),

    meetingsOverTime: async (
      period?: "week" | "month",
      count?: number,
    ): Promise<MeetingsOverTime[]> => {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      if (count) params.set("count", count.toString());
      const query = params.toString() ? `?${params}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/analytics/meetings-over-time${query}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<MeetingsOverTime[]>(response);
    },

    prospectFunnel: createEndpoint<[], ProspectFunnel[]>(apiClient, "GET", {
      path: "/annix-rep/analytics/prospect-funnel",
    }),

    winLossRateTrends: async (months?: number): Promise<WinLossRateTrend[]> => {
      const params = months ? `?months=${months}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/analytics/win-loss-trends${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<WinLossRateTrend[]>(response);
    },

    activityHeatmap: createEndpoint<[], ActivityHeatmapCell[]>(apiClient, "GET", {
      path: "/annix-rep/analytics/activity-heatmap",
    }),

    revenuePipeline: createEndpoint<[], RevenuePipeline[]>(apiClient, "GET", {
      path: "/annix-rep/analytics/revenue-pipeline",
    }),

    topProspects: async (limit?: number): Promise<TopProspect[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/analytics/top-prospects${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TopProspect[]>(response);
    },
  },

  bookingLinks: {
    list: createEndpoint<[], BookingLink[]>(apiClient, "GET", {
      path: "/annix-rep/booking-links",
    }),

    detail: createEndpoint<[id: number], BookingLink>(apiClient, "GET", {
      path: (id) => `/annix-rep/booking-links/${id}`,
    }),

    create: createEndpoint<[dto: CreateBookingLinkDto], BookingLink>(apiClient, "POST", {
      path: "/annix-rep/booking-links",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: UpdateBookingLinkDto], BookingLink>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/booking-links/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/booking-links/${id}`,
    }),
  },

  goals: {
    list: createEndpoint<[], SalesGoal[]>(apiClient, "GET", {
      path: "/annix-rep/goals",
    }),

    byPeriod: createEndpoint<[period: GoalPeriod], SalesGoal>(apiClient, "GET", {
      path: (period) => `/annix-rep/goals/${period}`,
    }),

    createOrUpdate: createEndpoint<[dto: CreateGoalDto], SalesGoal>(apiClient, "POST", {
      path: "/annix-rep/goals",
      body: (dto) => dto,
    }),

    update: createEndpoint<[period: GoalPeriod, dto: UpdateGoalDto], SalesGoal>(apiClient, "PUT", {
      path: (period, _dto) => `/annix-rep/goals/${period}`,
      body: (_period, dto) => dto,
    }),

    delete: createEndpoint<[period: GoalPeriod], void>(apiClient, "DELETE", {
      path: (period) => `/annix-rep/goals/${period}`,
    }),

    progress: createEndpoint<[period: GoalPeriod], GoalProgress>(apiClient, "GET", {
      path: (period) => `/annix-rep/goals/${period}/progress`,
    }),
  },

  reports: {
    weeklyActivity: async (startDate: string, endDate: string): Promise<WeeklyActivityReport> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/weekly-activity?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<WeeklyActivityReport>(response);
    },

    weeklyActivityPdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/weekly-activity/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      await throwIfNotOk(response);
      return response.blob();
    },

    monthlySales: async (month: string): Promise<MonthlySalesReport> => {
      const params = new URLSearchParams({ month });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/monthly-sales?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<MonthlySalesReport>(response);
    },

    monthlySalesPdf: async (month: string): Promise<Blob> => {
      const params = new URLSearchParams({ month });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/monthly-sales/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      await throwIfNotOk(response);
      return response.blob();
    },

    territoryCoverage: async (
      startDate: string,
      endDate: string,
    ): Promise<TerritoryCoverageReport> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/territory-coverage?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TerritoryCoverageReport>(response);
    },

    territoryCoveragePdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/territory-coverage/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      await throwIfNotOk(response);
      return response.blob();
    },

    meetingOutcomes: async (startDate: string, endDate: string): Promise<MeetingOutcomesReport> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/meeting-outcomes?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<MeetingOutcomesReport>(response);
    },

    meetingOutcomesPdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/reports/meeting-outcomes/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      await throwIfNotOk(response);
      return response.blob();
    },
  },

  discovery: {
    search: createEndpoint<[dto: DiscoverProspectsDto], DiscoverySearchResult>(apiClient, "POST", {
      path: "/annix-rep/discovery/search",
      body: (dto) => dto,
    }),

    import: createEndpoint<[businesses: DiscoveredBusiness[]], DiscoveryImportResult>(
      apiClient,
      "POST",
      {
        path: "/annix-rep/discovery/import",
        body: (businesses) => businesses,
      },
    ),

    quota: createEndpoint<[], DiscoveryQuota>(apiClient, "GET", {
      path: "/annix-rep/discovery/quota",
    }),
  },

  meetingPlatforms: {
    connections: createEndpoint<[], MeetingPlatformConnection[]>(apiClient, "GET", {
      path: "/annix-rep/meeting-platforms/connections",
    }),

    connection: createEndpoint<[id: number], MeetingPlatformConnection>(apiClient, "GET", {
      path: (id) => `/annix-rep/meeting-platforms/connections/${id}`,
    }),

    oauthUrl: async (
      platform: MeetingPlatform,
      redirectUri: string,
    ): Promise<{ url: string; state: string }> => {
      const params = new URLSearchParams({ redirectUri });
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/meeting-platforms/oauth/${platform}/url?${params}`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<{ url: string; state: string }>(response);
    },

    oauthCallback: createEndpoint<
      [platform: MeetingPlatform, authCode: string, redirectUri: string],
      MeetingPlatformConnection
    >(apiClient, "POST", {
      path: (platform, _authCode, _redirectUri) =>
        `/annix-rep/meeting-platforms/oauth/${platform}/callback`,
      body: (_platform, authCode, redirectUri) => ({ authCode, redirectUri }),
    }),

    update: createEndpoint<
      [id: number, dto: UpdateMeetingPlatformConnectionDto],
      MeetingPlatformConnection
    >(apiClient, "PATCH", {
      path: (id, _dto) => `/annix-rep/meeting-platforms/connections/${id}`,
      body: (_id, dto) => dto,
    }),

    disconnect: createEndpoint<[id: number], { success: boolean }>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/meeting-platforms/connections/${id}`,
    }),

    sync: async (
      id: number,
      daysBack?: number,
    ): Promise<{ synced: number; recordings: number }> => {
      const params = daysBack ? `?daysBack=${daysBack}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/meeting-platforms/connections/${id}/sync${params}`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<{ synced: number; recordings: number }>(response);
    },

    recordings: async (connectionId: number, limit?: number): Promise<PlatformMeetingRecord[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/meeting-platforms/connections/${connectionId}/recordings${params}`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<PlatformMeetingRecord[]>(response);
    },

    recording: createEndpoint<[recordId: number], PlatformMeetingRecord>(apiClient, "GET", {
      path: (recordId) => `/annix-rep/meeting-platforms/recordings/${recordId}`,
    }),

    availablePlatforms: async (): Promise<{
      platforms: Array<{ id: MeetingPlatform; name: string; description: string }>;
    }> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/meeting-platforms/available`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{
        platforms: Array<{ id: MeetingPlatform; name: string; description: string }>;
      }>(response);
    },
  },

  teamsBot: {
    join: createEndpoint<[dto: JoinTeamsMeetingDto], TeamsBotSession>(apiClient, "POST", {
      path: "/annix-rep/teams-bot/join",
      body: (dto) => dto,
    }),

    leave: createEndpoint<[sessionId: string], TeamsBotSession>(apiClient, "POST", {
      path: "/annix-rep/teams-bot/leave",
      body: (sessionId) => ({ sessionId }),
    }),

    session: createEndpoint<[sessionId: string], TeamsBotSession>(apiClient, "GET", {
      path: (sessionId) => `/annix-rep/teams-bot/sessions/${sessionId}`,
    }),

    activeSessions: createEndpoint<[], TeamsBotSession[]>(apiClient, "GET", {
      path: "/annix-rep/teams-bot/sessions/active",
    }),

    sessionHistory: async (limit?: number): Promise<TeamsBotSession[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/teams-bot/sessions/history${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TeamsBotSession[]>(response);
    },

    transcript: createEndpoint<[sessionId: string], TeamsBotTranscript>(apiClient, "GET", {
      path: (sessionId) => `/annix-rep/teams-bot/sessions/${sessionId}/transcript`,
    }),

    eventsUrl: (sessionId: string): string => {
      return `${browserBaseUrl()}/annix-rep/teams-bot/events/${sessionId}`;
    },
  },
};

export type MeetingPlatform = "zoom" | "teams" | "google_meet";
export type PlatformConnectionStatus = "active" | "error" | "disconnected" | "token_expired";
export type PlatformRecordingStatus =
  | "pending"
  | "downloading"
  | "downloaded"
  | "processing"
  | "transcribing"
  | "completed"
  | "failed"
  | "no_recording";

export interface MeetingPlatformConnection {
  id: number;
  userId: number;
  platform: MeetingPlatform;
  accountEmail: string;
  accountName: string | null;
  connectionStatus: PlatformConnectionStatus;
  autoFetchRecordings: boolean;
  autoTranscribe: boolean;
  autoSendSummary: boolean;
  lastRecordingSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export interface UpdateMeetingPlatformConnectionDto {
  autoFetchRecordings?: boolean;
  autoTranscribe?: boolean;
  autoSendSummary?: boolean;
}

export interface PlatformMeetingRecord {
  id: number;
  connectionId: number;
  meetingId: number | null;
  platformMeetingId: string;
  title: string;
  topic: string | null;
  hostEmail: string | null;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  recordingStatus: PlatformRecordingStatus;
  participantCount: number | null;
  joinUrl: string | null;
  createdAt: Date;
}

export type OrganizationPlan = "free" | "team" | "enterprise";
export type TeamRole = "admin" | "manager" | "rep";
export type TeamMemberStatus = "active" | "inactive" | "suspended";
export type TeamInvitationStatus = "pending" | "accepted" | "expired" | "cancelled" | "declined";
export type TeamActivityType =
  | "member_joined"
  | "member_left"
  | "prospect_created"
  | "prospect_status_changed"
  | "prospect_handoff"
  | "meeting_completed"
  | "deal_won"
  | "deal_lost"
  | "territory_assigned"
  | "note_shared";

export interface Organization {
  id: number;
  name: string;
  slug: string;
  ownerId: number;
  plan: OrganizationPlan;
  maxMembers: number;
  industry: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationDto {
  name: string;
  industry?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  industry?: string;
  logoUrl?: string;
  plan?: OrganizationPlan;
  maxMembers?: number;
}

export interface OrganizationStats {
  memberCount: number;
  activeMembers: number;
  territoryCount: number;
  prospectCount: number;
  meetingsThisMonth: number;
}

export interface TeamMember {
  id: number;
  organizationId: number;
  userId: number;
  role: TeamRole;
  status: TeamMemberStatus;
  reportsToId: number | null;
  joinedAt: Date;
  userName?: string;
  userEmail?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface TerritoryBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Territory {
  id: number;
  organizationId: number;
  name: string;
  description: string | null;
  provinces: string[] | null;
  cities: string[] | null;
  bounds: TerritoryBounds | null;
  assignedToId: number | null;
  assignedToName?: string;
  isActive: boolean;
  prospectCount?: number;
}

export interface CreateTerritoryDto {
  name: string;
  description?: string;
  provinces?: string[];
  cities?: string[];
  bounds?: TerritoryBounds;
}

export interface UpdateTerritoryDto extends Partial<CreateTerritoryDto> {
  isActive?: boolean;
}

export interface TeamInvitation {
  id: number;
  organizationId: number;
  email: string;
  inviteeName: string | null;
  role: TeamRole;
  territoryId: number | null;
  status: TeamInvitationStatus;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
  invitedByName?: string;
  organizationName?: string;
}

export interface CreateInvitationDto {
  email: string;
  inviteeName?: string;
  role?: TeamRole;
  territoryId?: number;
  message?: string;
}

export interface ValidateInvitationResult {
  valid: boolean;
  message?: string;
  invitation?: {
    id: number;
    email: string;
    inviteeName: string | null;
    role: TeamRole;
    status: string;
    expiresAt: Date;
    organizationName?: string;
    invitedByName?: string;
  };
}

export interface TeamActivity {
  id: number;
  userId: number;
  userName?: string;
  activityType: TeamActivityType;
  entityType: string;
  entityId: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ManagerDashboard {
  teamSize: number;
  activeReps: number;
  totalPipelineValue: number;
  teamMeetingsThisMonth: number;
  teamDealsWonThisMonth: number;
  teamDealsLostThisMonth: number;
}

export interface MemberPerformance {
  userId: number;
  userName: string;
  prospectCount: number;
  pipelineValue: number;
  dealsWon: number;
  dealsLost: number;
  meetingsCompleted: number;
  winRate: number;
}

export interface TerritoryPerformance {
  territoryId: number;
  territoryName: string;
  assignedToName: string | null;
  prospectCount: number;
  pipelineValue: number;
  dealsWon: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  value: number;
}

export interface TeamOverdueFollowUp {
  prospectId: number;
  companyName: string;
  ownerName: string;
  ownerId: number;
  nextFollowUpAt: string;
  daysOverdue: number;
  status: ProspectStatus;
}

export interface HandoffHistory {
  id: number;
  prospectId: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  reason: string | null;
  timestamp: Date;
}

export interface TeamHierarchyNode {
  member: TeamMember;
  directReports: TeamHierarchyNode[];
}

export const teamApi = {
  organization: {
    current: async (): Promise<Organization | null> => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/organization`, {
        headers: annixRepAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<Organization>(response);
    },

    create: createEndpoint<[dto: CreateOrganizationDto], Organization>(apiClient, "POST", {
      path: "/annix-rep/organization",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: UpdateOrganizationDto], Organization>(
      apiClient,
      "PATCH",
      {
        path: (id, _dto) => `/annix-rep/organization/${id}`,
        body: (_id, dto) => dto,
      },
    ),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/organization/${id}`,
    }),

    stats: createEndpoint<[id: number], OrganizationStats>(apiClient, "GET", {
      path: (id) => `/annix-rep/organization/${id}/stats`,
    }),
  },

  members: {
    list: createEndpoint<[], TeamMember[]>(apiClient, "GET", {
      path: "/annix-rep/team/members",
    }),

    detail: createEndpoint<[id: number], TeamMember>(apiClient, "GET", {
      path: (id) => `/annix-rep/team/members/${id}`,
    }),

    updateRole: createEndpoint<[id: number, role: TeamRole], TeamMember>(apiClient, "PATCH", {
      path: (id, _role) => `/annix-rep/team/members/${id}/role`,
      body: (_id, role) => ({ role }),
    }),

    remove: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/team/members/${id}`,
    }),

    setReportsTo: createEndpoint<[id: number, reportsToId: number | null], TeamMember>(
      apiClient,
      "PATCH",
      {
        path: (id, _reportsToId) => `/annix-rep/team/members/${id}/reports-to`,
        body: (_id, reportsToId) => ({ reportsToId }),
      },
    ),

    hierarchy: createEndpoint<[], TeamHierarchyNode[]>(apiClient, "GET", {
      path: "/annix-rep/team/hierarchy",
    }),

    myTeam: createEndpoint<[], TeamMember[]>(apiClient, "GET", {
      path: "/annix-rep/team/my-team",
    }),
  },

  invitations: {
    list: createEndpoint<[], TeamInvitation[]>(apiClient, "GET", {
      path: "/annix-rep/team/invitations",
    }),

    create: createEndpoint<[dto: CreateInvitationDto], TeamInvitation>(apiClient, "POST", {
      path: "/annix-rep/team/invitations",
      body: (dto) => dto,
    }),

    validate: async (token: string): Promise<ValidateInvitationResult> => {
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/team/invitations/validate/${token}`,
      );
      return handleResponse<ValidateInvitationResult>(response);
    },

    accept: createEndpoint<[token: string], TeamMember>(apiClient, "POST", {
      path: (token) => `/annix-rep/team/invitations/${token}/accept`,
    }),

    decline: async (token: string): Promise<void> => {
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/team/invitations/${token}/decline`,
        {
          method: "POST",
        },
      );
      await throwIfNotOk(response);
    },

    cancel: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/team/invitations/${id}`,
    }),

    resend: createEndpoint<[id: number], TeamInvitation>(apiClient, "POST", {
      path: (id) => `/annix-rep/team/invitations/${id}/resend`,
    }),
  },

  territories: {
    list: createEndpoint<[], Territory[]>(apiClient, "GET", {
      path: "/annix-rep/territories",
    }),

    my: createEndpoint<[], Territory[]>(apiClient, "GET", {
      path: "/annix-rep/territories/my",
    }),

    detail: createEndpoint<[id: number], Territory>(apiClient, "GET", {
      path: (id) => `/annix-rep/territories/${id}`,
    }),

    create: createEndpoint<[dto: CreateTerritoryDto], Territory>(apiClient, "POST", {
      path: "/annix-rep/territories",
      body: (dto) => dto,
    }),

    update: createEndpoint<[id: number, dto: UpdateTerritoryDto], Territory>(apiClient, "PATCH", {
      path: (id, _dto) => `/annix-rep/territories/${id}`,
      body: (_id, dto) => dto,
    }),

    delete: createEndpoint<[id: number], void>(apiClient, "DELETE", {
      path: (id) => `/annix-rep/territories/${id}`,
    }),

    assign: createEndpoint<[id: number, userId: number | null], Territory>(apiClient, "PATCH", {
      path: (id, _userId) => `/annix-rep/territories/${id}/assign`,
      body: (_id, userId) => ({ userId }),
    }),

    prospects: createEndpoint<[id: number], Prospect[]>(apiClient, "GET", {
      path: (id) => `/annix-rep/territories/${id}/prospects`,
    }),
  },

  handoff: {
    handoff: createEndpoint<[prospectId: number, toUserId: number, reason?: string], Prospect>(
      apiClient,
      "POST",
      {
        path: (prospectId, _toUserId, _reason) => `/annix-rep/prospects/handoff/${prospectId}`,
        body: (_prospectId, toUserId, reason) => ({ toUserId, reason }),
      },
    ),

    bulkHandoff: createEndpoint<
      [prospectIds: number[], toUserId: number, reason?: string],
      Prospect[]
    >(apiClient, "POST", {
      path: "/annix-rep/prospects/handoff/bulk",
      body: (prospectIds, toUserId, reason) => ({ prospectIds, toUserId, reason }),
    }),

    history: createEndpoint<[prospectId: number], HandoffHistory[]>(apiClient, "GET", {
      path: (prospectId) => `/annix-rep/prospects/handoff/${prospectId}/history`,
    }),
  },

  activity: {
    feed: async (limit?: number): Promise<TeamActivity[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(`${browserBaseUrl()}/annix-rep/team/activity/feed${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<TeamActivity[]>(response);
    },

    myTeamFeed: async (limit?: number): Promise<TeamActivity[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/team/activity/feed/my-team${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TeamActivity[]>(response);
    },

    userActivity: async (userId: number, limit?: number): Promise<TeamActivity[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/team/activity/user/${userId}${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TeamActivity[]>(response);
    },
  },

  manager: {
    dashboard: createEndpoint<[], ManagerDashboard>(apiClient, "GET", {
      path: "/annix-rep/manager/dashboard",
    }),

    teamPerformance: async (startDate?: string, endDate?: string): Promise<MemberPerformance[]> => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const query = params.toString() ? `?${params}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/manager/team-performance${query}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<MemberPerformance[]>(response);
    },

    territoryPerformance: createEndpoint<[], TerritoryPerformance[]>(apiClient, "GET", {
      path: "/annix-rep/manager/territory-performance",
    }),

    pipelineByRep: async (): Promise<
      Array<{ userId: number; userName: string; pipeline: number }>
    > => {
      const response = await fetch(`${browserBaseUrl()}/annix-rep/manager/pipeline-by-rep`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Array<{ userId: number; userName: string; pipeline: number }>>(
        response,
      );
    },

    leaderboard: async (
      metric?: "deals_won" | "pipeline_value" | "meetings_completed" | "prospects_created",
    ): Promise<LeaderboardEntry[]> => {
      const params = metric ? `?metric=${metric}` : "";
      const response = await fetch(`${browserBaseUrl()}/annix-rep/manager/leaderboard${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<LeaderboardEntry[]>(response);
    },

    overdueFollowUps: async (limit?: number): Promise<TeamOverdueFollowUp[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(
        `${browserBaseUrl()}/annix-rep/manager/overdue-followups${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TeamOverdueFollowUp[]>(response);
    },
  },
};

export const publicBookingApi = {
  linkDetails: async (slug: string): Promise<PublicBookingLink> => {
    const response = await fetch(`${browserBaseUrl()}/public/booking/${slug}`);
    return handleResponse<PublicBookingLink>(response);
  },

  availability: async (slug: string, date: string): Promise<AvailableSlot[]> => {
    const params = new URLSearchParams({ date });
    const response = await fetch(
      `${browserBaseUrl()}/public/booking/${slug}/availability?${params}`,
    );
    return handleResponse<AvailableSlot[]>(response);
  },

  bookSlot: async (slug: string, dto: BookSlotDto): Promise<BookingConfirmation> => {
    const response = await fetch(`${browserBaseUrl()}/public/booking/${slug}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    return handleResponse<BookingConfirmation>(response);
  },
};
