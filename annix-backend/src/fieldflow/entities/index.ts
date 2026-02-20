export { RepProfile, type TargetCustomerProfile } from "../rep-profile";
export { BookingLink, type CustomQuestion } from "./booking-link.entity";
export {
  CalendarColor,
  type CalendarColorType,
  DEFAULT_MEETING_TYPE_COLORS,
  DEFAULT_STATUS_COLORS,
} from "./calendar-color.entity";
export {
  CalendarConnection,
  CalendarProvider,
  CalendarSyncStatus,
} from "./calendar-connection.entity";
export { CalendarEvent, CalendarEventStatus } from "./calendar-event.entity";
export type { FieldMapping, WebhookConfig } from "./crm-config.entity";
export { ConflictResolutionStrategy, CrmConfig, CrmType } from "./crm-config.entity";
export type { SyncErrorDetail } from "./crm-sync-log.entity";
export { CrmSyncLog, SyncDirection, SyncStatus } from "./crm-sync-log.entity";
export { CustomFieldDefinition, CustomFieldType } from "./custom-field-definition.entity";
export {
  Meeting,
  MeetingStatus,
  MeetingType,
} from "./meeting.entity";
export {
  MeetingPlatform,
  PlatformConnectionStatus,
} from "./meeting-platform.enums";
export { MeetingPlatformConnection } from "./meeting-platform-connection.entity";
export type { SpeakerSegment } from "./meeting-recording.entity";
export {
  MeetingRecording,
  RecordingProcessingStatus,
} from "./meeting-recording.entity";
export type {
  ActionItem,
  DealProbability,
  MeetingAnalysis,
  ObjectionResponse,
  TranscriptSegment,
} from "./meeting-transcript.entity";
export { MeetingTranscript } from "./meeting-transcript.entity";
export { Organization, OrganizationPlan } from "./organization.entity";
export type {
  PlatformMeetingRawData,
  PlatformRecordingRawData,
} from "./platform-meeting-record.entity";
export {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "./platform-meeting-record.entity";
export { FollowUpRecurrence, Prospect, ProspectPriority, ProspectStatus } from "./prospect.entity";
export { ProspectActivity, ProspectActivityType } from "./prospect-activity.entity";
export { GoalPeriod, SalesGoal } from "./sales-goal.entity";
export type { ConflictData } from "./sync-conflict.entity";
export {
  type ConflictResolution,
  type ConflictType,
  SyncConflict,
} from "./sync-conflict.entity";
export { TeamActivity, TeamActivityType } from "./team-activity.entity";
export { TeamInvitation, TeamInvitationStatus } from "./team-invitation.entity";
export { TeamMember, TeamMemberStatus, TeamRole } from "./team-member.entity";
export type {
  TeamsBotParticipant,
  TeamsBotTranscriptEntry,
} from "./teams-bot-session.entity";
export { TeamsBotSession, TeamsBotSessionStatus } from "./teams-bot-session.entity";
export type { TerritoryBounds } from "./territory.entity";
export { Territory } from "./territory.entity";
export { Visit, VisitOutcome, VisitType } from "./visit.entity";
