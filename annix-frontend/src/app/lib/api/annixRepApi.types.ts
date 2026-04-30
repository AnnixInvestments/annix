/**
 * Type declarations for annixRepApi. Extracted from annixRepApi.ts as part
 * of issue #233 Phase 2C to slim that file down.
 */
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
