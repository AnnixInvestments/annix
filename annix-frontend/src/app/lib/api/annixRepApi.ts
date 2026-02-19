import { annixRepAuthHeaders } from "@/lib/api-config";

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return "http://localhost:4001";
  }
  return "http://localhost:4001";
};

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const annixRepApi = {
  dashboard: async (): Promise<AnnixRepDashboard> => {
    const [prospectsRes, meetingsRes, followUpsRes] = await Promise.all([
      fetch(`${getApiUrl()}/annix-rep/prospects`, {
        headers: annixRepAuthHeaders(),
      }),
      fetch(`${getApiUrl()}/annix-rep/meetings/today`, {
        headers: annixRepAuthHeaders(),
      }),
      fetch(`${getApiUrl()}/annix-rep/prospects/follow-ups`, {
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
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    listByStatus: async (status: ProspectStatus): Promise<Prospect[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/status/${status}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    detail: async (id: number): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    create: async (dto: CreateProspectDto): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Prospect>(response);
    },

    update: async (id: number, dto: Partial<CreateProspectDto>): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Prospect>(response);
    },

    updateStatus: async (id: number, status: ProspectStatus): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}/status/${status}`, {
        method: "PATCH",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    markContacted: async (id: number): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}/contacted`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    completeFollowUp: async (id: number): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}/complete-followup`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect>(response);
    },

    snoozeFollowUp: async (id: number, days: number): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}/snooze-followup`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days }),
      });
      return handleResponse<Prospect>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
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

      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/nearby?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    stats: async (): Promise<Record<ProspectStatus, number>> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/stats`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Record<ProspectStatus, number>>(response);
    },

    followUpsDue: async (): Promise<Prospect[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/follow-ups`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Prospect[]>(response);
    },

    bulkUpdateStatus: async (
      ids: number[],
      status: ProspectStatus,
    ): Promise<BulkUpdateStatusResponse> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/bulk/status`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, status }),
      });
      return handleResponse<BulkUpdateStatusResponse>(response);
    },

    bulkDelete: async (ids: number[]): Promise<BulkDeleteResponse> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/bulk`, {
        method: "DELETE",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
      return handleResponse<BulkDeleteResponse>(response);
    },

    exportCsv: async (): Promise<Blob> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/export/csv`, {
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    duplicates: async (): Promise<DuplicateProspects[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/duplicates`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<DuplicateProspects[]>(response);
    },

    import: async (
      rows: ImportProspectRow[],
      skipInvalid = true,
    ): Promise<ImportProspectsResult> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/import`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows, skipInvalid }),
      });
      return handleResponse<ImportProspectsResult>(response);
    },

    merge: async (dto: MergeProspectsDto): Promise<Prospect> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/merge`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Prospect>(response);
    },

    bulkTagOperation: async (dto: BulkTagOperationDto): Promise<BulkTagOperationResponse> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/bulk/tags`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<BulkTagOperationResponse>(response);
    },

    bulkAssign: async (
      ids: number[],
      assignedToId: number | null,
    ): Promise<{ updated: number; updatedIds: number[] }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/bulk/assign`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, assignedToId }),
      });
      return handleResponse<{ updated: number; updatedIds: number[] }>(response);
    },

    recalculateScores: async (): Promise<{ updated: number }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/recalculate-scores`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ updated: number }>(response);
    },

    activities: async (id: number, limit?: number): Promise<ProspectActivity[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/prospects/${id}/activities${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<ProspectActivity[]>(response);
    },
  },

  customFields: {
    list: async (includeInactive = false): Promise<CustomFieldDefinition[]> => {
      const params = includeInactive ? "?includeInactive=true" : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/custom-fields${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CustomFieldDefinition[]>(response);
    },

    detail: async (id: number): Promise<CustomFieldDefinition> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/custom-fields/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CustomFieldDefinition>(response);
    },

    create: async (dto: CreateCustomFieldDto): Promise<CustomFieldDefinition> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/custom-fields`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CustomFieldDefinition>(response);
    },

    update: async (id: number, dto: UpdateCustomFieldDto): Promise<CustomFieldDefinition> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/custom-fields/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CustomFieldDefinition>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/custom-fields/${id}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    reorder: async (orderedIds: number[]): Promise<CustomFieldDefinition[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/custom-fields/reorder`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderedIds }),
      });
      return handleResponse<CustomFieldDefinition[]>(response);
    },
  },

  meetings: {
    list: async (): Promise<Meeting[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    today: async (): Promise<Meeting[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/today`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    upcoming: async (days?: number): Promise<Meeting[]> => {
      const params = days ? `?days=${days}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/upcoming${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Meeting[]>(response);
    },

    detail: async (id: number): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Meeting>(response);
    },

    create: async (dto: CreateMeetingDto): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    update: async (id: number, dto: Partial<CreateMeetingDto>): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    start: async (id: number): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}/start`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      return handleResponse<Meeting>(response);
    },

    end: async (id: number, notes?: string, outcomes?: string): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}/end`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes, outcomes }),
      });
      return handleResponse<Meeting>(response);
    },

    cancel: async (id: number): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}/cancel`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Meeting>(response);
    },

    reschedule: async (id: number, dto: RescheduleMeetingDto): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}/reschedule`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/${id}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    createRecurring: async (dto: CreateRecurringMeetingDto): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/recurring`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    expandedRecurring: async (startDate: string, endDate: string): Promise<Meeting[]> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${getApiUrl()}/annix-rep/meetings/recurring/expanded?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<Meeting[]>(response);
    },

    seriesInstances: async (parentId: number): Promise<Meeting[]> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/meetings/recurring/${parentId}/instances`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<Meeting[]>(response);
    },

    updateRecurring: async (id: number, dto: UpdateRecurringMeetingDto): Promise<Meeting> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/recurring/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Meeting>(response);
    },

    deleteRecurring: async (id: number, dto: DeleteRecurringMeetingDto): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/meetings/recurring/${id}`, {
        method: "DELETE",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },
  },

  visits: {
    list: async (): Promise<Visit[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/visits`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Visit[]>(response);
    },

    today: async (): Promise<Visit[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/visits/today`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Visit[]>(response);
    },

    byProspect: async (prospectId: number): Promise<Visit[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/visits/prospect/${prospectId}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Visit[]>(response);
    },

    create: async (dto: CreateVisitDto): Promise<Visit> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/visits`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Visit>(response);
    },

    checkIn: async (id: number, latitude: number, longitude: number): Promise<Visit> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/visits/${id}/check-in`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
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
      const response = await fetch(`${getApiUrl()}/annix-rep/visits/${id}/check-out`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
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
        `${getApiUrl()}/annix-rep/calendars/oauth-url/${provider}?${params}`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<{ url: string }>(response);
    },

    connect: async (dto: ConnectCalendarDto): Promise<CalendarConnection> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/connect`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CalendarConnection>(response);
    },

    connections: async (): Promise<CalendarConnection[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/connections`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CalendarConnection[]>(response);
    },

    connection: async (id: number): Promise<CalendarConnection> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/connections/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CalendarConnection>(response);
    },

    update: async (id: number, dto: UpdateCalendarConnectionDto): Promise<CalendarConnection> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/connections/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CalendarConnection>(response);
    },

    disconnect: async (id: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/connections/${id}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Disconnect failed" }));
        throw new Error(error.message);
      }
    },

    availableCalendars: async (connectionId: number): Promise<CalendarListItem[]> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/calendars/connections/${connectionId}/calendars`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<CalendarListItem[]>(response);
    },

    sync: async (connectionId: number, fullSync?: boolean): Promise<SyncResult> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/calendars/connections/${connectionId}/sync`,
        {
          method: "POST",
          headers: {
            ...annixRepAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fullSync: fullSync ?? false }),
        },
      );
      return handleResponse<SyncResult>(response);
    },

    events: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/events?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CalendarEvent[]>(response);
    },

    colors: async (): Promise<CalendarColorScheme> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/colors`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CalendarColorScheme>(response);
    },

    setColors: async (
      colors: Array<{ colorType: CalendarColorType; colorKey: string; colorValue: string }>,
    ): Promise<{ success: boolean }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/colors`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ colors }),
      });
      return handleResponse<{ success: boolean }>(response);
    },

    setColor: async (
      colorType: CalendarColorType,
      colorKey: string,
      colorValue: string,
    ): Promise<void> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/calendars/colors/${colorType}/${colorKey}`,
        {
          method: "PATCH",
          headers: {
            ...annixRepAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ colorValue }),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Set color failed" }));
        throw new Error(error.message);
      }
    },

    resetColors: async (colorType?: CalendarColorType): Promise<{ success: boolean }> => {
      const params = colorType ? `?colorType=${colorType}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/colors/reset${params}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ success: boolean }>(response);
    },

    conflicts: async (): Promise<SyncConflict[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/conflicts`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<SyncConflict[]>(response);
    },

    conflictCount: async (): Promise<{ count: number }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/conflicts/count`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ count: number }>(response);
    },

    conflict: async (id: number): Promise<SyncConflict> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/conflicts/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<SyncConflict>(response);
    },

    resolveConflict: async (
      id: number,
      resolution: "keep_local" | "keep_remote" | "dismissed",
    ): Promise<SyncConflict> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/conflicts/${id}/resolve`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resolution }),
      });
      return handleResponse<SyncConflict>(response);
    },

    detectConflicts: async (): Promise<{ detected: number }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/calendars/conflicts/detect`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ detected: number }>(response);
    },
  },

  recordings: {
    initiate: async (dto: InitiateUploadDto): Promise<InitiateUploadResponse> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/recordings/initiate`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
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
        `${getApiUrl()}/annix-rep/recordings/${recordingId}/chunk?index=${chunkIndex}`,
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

    complete: async (recordingId: number, dto: CompleteUploadDto): Promise<Recording> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/recordings/${recordingId}/complete`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Recording>(response);
    },

    detail: async (recordingId: number): Promise<Recording> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/recordings/${recordingId}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<Recording>(response);
    },

    byMeeting: async (meetingId: number): Promise<Recording | null> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/recordings/meeting/${meetingId}`, {
        headers: annixRepAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<Recording>(response);
    },

    updateSpeakerLabels: async (
      recordingId: number,
      speakerLabels: Record<string, string>,
    ): Promise<Recording> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/recordings/${recordingId}/speaker-labels`,
        {
          method: "PATCH",
          headers: {
            ...annixRepAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ speakerLabels }),
        },
      );
      return handleResponse<Recording>(response);
    },

    delete: async (recordingId: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/recordings/${recordingId}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    streamUrl: (recordingId: number): string | null => {
      if (typeof window === "undefined") return null;
      const token = localStorage.getItem("annixRepAccessToken");
      if (!token) return null;
      return `${getApiUrl()}/annix-rep/recordings/${recordingId}/stream?token=${encodeURIComponent(token)}`;
    },
  },

  transcripts: {
    byRecording: async (recordingId: number): Promise<Transcript | null> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/transcripts/recording/${recordingId}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (response.status === 404) return null;
      return handleResponse<Transcript>(response);
    },

    byMeeting: async (meetingId: number): Promise<Transcript | null> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/transcripts/meeting/${meetingId}`, {
        headers: annixRepAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<Transcript>(response);
    },

    transcribe: async (recordingId: number): Promise<Transcript> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/transcripts/recording/${recordingId}/transcribe`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<Transcript>(response);
    },

    retranscribe: async (recordingId: number): Promise<Transcript> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/transcripts/recording/${recordingId}/retranscribe`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<Transcript>(response);
    },

    update: async (transcriptId: number, dto: UpdateTranscriptDto): Promise<Transcript> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/transcripts/${transcriptId}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<Transcript>(response);
    },

    delete: async (recordingId: number): Promise<void> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/transcripts/recording/${recordingId}`,
        {
          method: "DELETE",
          headers: annixRepAuthHeaders(),
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
        `${getApiUrl()}/annix-rep/summaries/meeting/${meetingId}/preview`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<SummaryPreview>(response);
    },

    generate: async (meetingId: number): Promise<MeetingSummary> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/summaries/meeting/${meetingId}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<MeetingSummary>(response);
    },

    send: async (meetingId: number, dto: SendSummaryDto): Promise<SendSummaryResult> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/summaries/meeting/${meetingId}/send`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<SendSummaryResult>(response);
    },
  },

  crm: {
    configs: async (): Promise<CrmConfig[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CrmConfig[]>(response);
    },

    config: async (id: number): Promise<CrmConfig> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CrmConfig>(response);
    },

    create: async (dto: CreateCrmConfigDto): Promise<CrmConfig> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CrmConfig>(response);
    },

    update: async (id: number, dto: UpdateCrmConfigDto): Promise<CrmConfig> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<CrmConfig>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${id}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    testConnection: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${id}/test`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ success: boolean; message: string }>(response);
    },

    syncProspect: async (configId: number, prospectId: number): Promise<CrmSyncResult> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/crm/configs/${configId}/sync/prospect/${prospectId}`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<CrmSyncResult>(response);
    },

    syncMeeting: async (configId: number, meetingId: number): Promise<CrmSyncResult> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/crm/configs/${configId}/sync/meeting/${meetingId}`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<CrmSyncResult>(response);
    },

    syncAllProspects: async (configId: number): Promise<{ synced: number; failed: number }> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/crm/configs/${configId}/sync/all-prospects`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<{ synced: number; failed: number }>(response);
    },

    syncStatus: async (configId: number): Promise<CrmSyncStatus> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${configId}/status`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CrmSyncStatus>(response);
    },

    exportProspectsCsv: async (configId?: number): Promise<Blob> => {
      const params = configId ? `?configId=${configId}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/export/prospects${params}`, {
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    exportMeetingsCsv: async (configId?: number): Promise<Blob> => {
      const params = configId ? `?configId=${configId}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/export/meetings${params}`, {
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    oauthUrl: async (provider: CrmProvider, redirectUri: string): Promise<{ url: string }> => {
      const params = new URLSearchParams({ redirectUri });
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/oauth/${provider}/url?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ url: string }>(response);
    },

    oauthCallback: async (
      provider: CrmProvider,
      code: string,
      redirectUri: string,
    ): Promise<CrmConfig> => {
      const params = new URLSearchParams({ code, redirectUri });
      const response = await fetch(
        `${getApiUrl()}/annix-rep/crm/oauth/${provider}/callback?${params}`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<CrmConfig>(response);
    },

    disconnect: async (configId: number): Promise<{ success: boolean }> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${configId}/disconnect`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<{ success: boolean }>(response);
    },

    syncNow: async (configId: number): Promise<CrmSyncLog> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${configId}/sync-now`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CrmSyncLog>(response);
    },

    pullAll: async (configId: number): Promise<CrmSyncLog> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/crm/configs/${configId}/pull-all`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<CrmSyncLog>(response);
    },

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
        `${getApiUrl()}/annix-rep/crm/configs/${configId}/sync-logs${query}`,
        { headers: annixRepAuthHeaders() },
      );
      return handleResponse<{ logs: CrmSyncLog[]; total: number }>(response);
    },

    refreshToken: async (configId: number): Promise<{ success: boolean }> => {
      const response = await fetch(
        `${getApiUrl()}/annix-rep/crm/configs/${configId}/refresh-token`,
        {
          method: "POST",
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<{ success: boolean }>(response);
    },
  },

  routes: {
    scheduleGaps: async (date: string, minGapMinutes?: number): Promise<ScheduleGap[]> => {
      const params = new URLSearchParams({ date });
      if (minGapMinutes) params.set("minGapMinutes", minGapMinutes.toString());
      const response = await fetch(`${getApiUrl()}/annix-rep/routes/gaps?${params}`, {
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
        `${getApiUrl()}/annix-rep/routes/cold-call-suggestions?${params}`,
        {
          headers: annixRepAuthHeaders(),
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
      const response = await fetch(`${getApiUrl()}/annix-rep/routes/optimize`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
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
      const response = await fetch(`${getApiUrl()}/annix-rep/routes/plan-day?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<OptimizedRoute>(response);
    },
  },

  repProfile: {
    status: async (): Promise<RepProfileStatus> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/rep-profile/status`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<RepProfileStatus>(response);
    },

    profile: async (): Promise<RepProfile | null> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/rep-profile`, {
        headers: annixRepAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<RepProfile>(response);
    },

    create: async (dto: CreateRepProfileDto): Promise<RepProfile> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/rep-profile`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<RepProfile>(response);
    },

    update: async (dto: UpdateRepProfileDto): Promise<RepProfile> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/rep-profile`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<RepProfile>(response);
    },

    completeSetup: async (): Promise<RepProfile> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/rep-profile/complete-setup`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<RepProfile>(response);
    },

    searchTerms: async (): Promise<string[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/rep-profile/search-terms`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<string[]>(response);
    },
  },

  analytics: {
    summary: async (): Promise<AnalyticsSummary> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/analytics/summary`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<AnalyticsSummary>(response);
    },

    meetingsOverTime: async (
      period?: "week" | "month",
      count?: number,
    ): Promise<MeetingsOverTime[]> => {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      if (count) params.set("count", count.toString());
      const query = params.toString() ? `?${params}` : "";
      const response = await fetch(
        `${getApiUrl()}/annix-rep/analytics/meetings-over-time${query}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<MeetingsOverTime[]>(response);
    },

    prospectFunnel: async (): Promise<ProspectFunnel[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/analytics/prospect-funnel`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<ProspectFunnel[]>(response);
    },

    winLossRateTrends: async (months?: number): Promise<WinLossRateTrend[]> => {
      const params = months ? `?months=${months}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/analytics/win-loss-trends${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<WinLossRateTrend[]>(response);
    },

    activityHeatmap: async (): Promise<ActivityHeatmapCell[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/analytics/activity-heatmap`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<ActivityHeatmapCell[]>(response);
    },

    revenuePipeline: async (): Promise<RevenuePipeline[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/analytics/revenue-pipeline`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<RevenuePipeline[]>(response);
    },

    topProspects: async (limit?: number): Promise<TopProspect[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const response = await fetch(`${getApiUrl()}/annix-rep/analytics/top-prospects${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<TopProspect[]>(response);
    },
  },

  bookingLinks: {
    list: async (): Promise<BookingLink[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/booking-links`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<BookingLink[]>(response);
    },

    detail: async (id: number): Promise<BookingLink> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/booking-links/${id}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<BookingLink>(response);
    },

    create: async (dto: CreateBookingLinkDto): Promise<BookingLink> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/booking-links`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<BookingLink>(response);
    },

    update: async (id: number, dto: UpdateBookingLinkDto): Promise<BookingLink> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/booking-links/${id}`, {
        method: "PATCH",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<BookingLink>(response);
    },

    delete: async (id: number): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/booking-links/${id}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },
  },

  goals: {
    list: async (): Promise<SalesGoal[]> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/goals`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<SalesGoal[]>(response);
    },

    byPeriod: async (period: GoalPeriod): Promise<SalesGoal> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/goals/${period}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<SalesGoal>(response);
    },

    createOrUpdate: async (dto: CreateGoalDto): Promise<SalesGoal> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/goals`, {
        method: "POST",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<SalesGoal>(response);
    },

    update: async (period: GoalPeriod, dto: UpdateGoalDto): Promise<SalesGoal> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/goals/${period}`, {
        method: "PUT",
        headers: {
          ...annixRepAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });
      return handleResponse<SalesGoal>(response);
    },

    delete: async (period: GoalPeriod): Promise<void> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/goals/${period}`, {
        method: "DELETE",
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message);
      }
    },

    progress: async (period: GoalPeriod): Promise<GoalProgress> => {
      const response = await fetch(`${getApiUrl()}/annix-rep/goals/${period}/progress`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<GoalProgress>(response);
    },
  },

  reports: {
    weeklyActivity: async (startDate: string, endDate: string): Promise<WeeklyActivityReport> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${getApiUrl()}/annix-rep/reports/weekly-activity?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<WeeklyActivityReport>(response);
    },

    weeklyActivityPdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${getApiUrl()}/annix-rep/reports/weekly-activity/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "PDF generation failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    monthlySales: async (month: string): Promise<MonthlySalesReport> => {
      const params = new URLSearchParams({ month });
      const response = await fetch(`${getApiUrl()}/annix-rep/reports/monthly-sales?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<MonthlySalesReport>(response);
    },

    monthlySalesPdf: async (month: string): Promise<Blob> => {
      const params = new URLSearchParams({ month });
      const response = await fetch(`${getApiUrl()}/annix-rep/reports/monthly-sales/pdf?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "PDF generation failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    territoryCoverage: async (
      startDate: string,
      endDate: string,
    ): Promise<TerritoryCoverageReport> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${getApiUrl()}/annix-rep/reports/territory-coverage?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      return handleResponse<TerritoryCoverageReport>(response);
    },

    territoryCoveragePdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${getApiUrl()}/annix-rep/reports/territory-coverage/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "PDF generation failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },

    meetingOutcomes: async (startDate: string, endDate: string): Promise<MeetingOutcomesReport> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${getApiUrl()}/annix-rep/reports/meeting-outcomes?${params}`, {
        headers: annixRepAuthHeaders(),
      });
      return handleResponse<MeetingOutcomesReport>(response);
    },

    meetingOutcomesPdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `${getApiUrl()}/annix-rep/reports/meeting-outcomes/pdf?${params}`,
        {
          headers: annixRepAuthHeaders(),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "PDF generation failed" }));
        throw new Error(error.message);
      }
      return response.blob();
    },
  },
};

export const publicBookingApi = {
  linkDetails: async (slug: string): Promise<PublicBookingLink> => {
    const response = await fetch(`${getApiUrl()}/public/booking/${slug}`);
    return handleResponse<PublicBookingLink>(response);
  },

  availability: async (slug: string, date: string): Promise<AvailableSlot[]> => {
    const params = new URLSearchParams({ date });
    const response = await fetch(`${getApiUrl()}/public/booking/${slug}/availability?${params}`);
    return handleResponse<AvailableSlot[]>(response);
  },

  bookSlot: async (slug: string, dto: BookSlotDto): Promise<BookingConfirmation> => {
    const response = await fetch(`${getApiUrl()}/public/booking/${slug}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    return handleResponse<BookingConfirmation>(response);
  },
};
