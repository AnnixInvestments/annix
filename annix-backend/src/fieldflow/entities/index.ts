export { RepProfile, type TargetCustomerProfile } from "../rep-profile";
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
export type { SpeakerSegment } from "./meeting-recording.entity";
export {
  MeetingRecording,
  RecordingProcessingStatus,
} from "./meeting-recording.entity";
export type {
  ActionItem,
  MeetingAnalysis,
  TranscriptSegment,
} from "./meeting-transcript.entity";
export { MeetingTranscript } from "./meeting-transcript.entity";
export { FollowUpRecurrence, Prospect, ProspectPriority, ProspectStatus } from "./prospect.entity";
export { ProspectActivity, ProspectActivityType } from "./prospect-activity.entity";
export { GoalPeriod, SalesGoal } from "./sales-goal.entity";
export { Visit, VisitOutcome, VisitType } from "./visit.entity";
