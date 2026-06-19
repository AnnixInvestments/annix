import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NixModule } from "../nix/nix.module";
import { StorageModule } from "../storage/storage.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { AnnixRepAuthModule } from "./auth";
import { BookingLinkRepository } from "./booking-link.repository";
import { MongoBookingLinkRepository } from "./booking-link.repository.mongo";
import { CalendarColorRepository } from "./calendar-color.repository";
import { MongoCalendarColorRepository } from "./calendar-color.repository.mongo";
import { CalendarConnectionRepository } from "./calendar-connection.repository";
import { MongoCalendarConnectionRepository } from "./calendar-connection.repository.mongo";
import { CalendarEventRepository } from "./calendar-event.repository";
import { MongoCalendarEventRepository } from "./calendar-event.repository.mongo";
import { AnnixRepCapabilities } from "./capabilities/annix-rep.capabilities";
import {
  AnalyticsController,
  BookingController,
  CalendarController,
  CrmController,
  CustomFieldController,
  GoalsController,
  ManagerDashboardController,
  MeetingController,
  MeetingPlatformController,
  OrganizationController,
  PlatformWebhookController,
  ProspectController,
  ProspectHandoffController,
  PublicBookingController,
  RecordingController,
  ReportsController,
  RouteController,
  SummaryController,
  TeamActivityController,
  TeamController,
  TeamInvitationController,
  TeamsBotController,
  TeamsBotWebhookController,
  TerritoryController,
  TranscriptController,
  VisitController,
} from "./controllers";
import { CrmConfigRepository } from "./crm-config.repository";
import { MongoCrmConfigRepository } from "./crm-config.repository.mongo";
import { CrmSyncLogRepository } from "./crm-sync-log.repository";
import { MongoCrmSyncLogRepository } from "./crm-sync-log.repository.mongo";
import { CustomFieldDefinitionRepository } from "./custom-field-definition.repository";
import { MongoCustomFieldDefinitionRepository } from "./custom-field-definition.repository.mongo";
import { DiscoveryModule } from "./discovery";
import { TeamsBotGateway } from "./gateways/teams-bot.gateway";
import { MeetingRepository } from "./meeting.repository";
import { MongoMeetingRepository } from "./meeting.repository.mongo";
import { MeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository";
import { MongoMeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository.mongo";
import { MeetingRecordingRepository } from "./meeting-recording.repository";
import { MongoMeetingRecordingRepository } from "./meeting-recording.repository.mongo";
import { MeetingTranscriptRepository } from "./meeting-transcript.repository";
import { MongoMeetingTranscriptRepository } from "./meeting-transcript.repository.mongo";
import { OrganizationRepository } from "./organization.repository";
import { MongoOrganizationRepository } from "./organization.repository.mongo";
import { PlatformMeetingRecordRepository } from "./platform-meeting-record.repository";
import { MongoPlatformMeetingRecordRepository } from "./platform-meeting-record.repository.mongo";
import { ProspectRepository } from "./prospect.repository";
import { MongoProspectRepository } from "./prospect.repository.mongo";
import { ProspectActivityRepository } from "./prospect-activity.repository";
import { MongoProspectActivityRepository } from "./prospect-activity.repository.mongo";
import {
  CaldavCalendarProvider,
  GoogleCalendarProvider,
  GoogleMeetProvider,
  HubSpotOAuthProvider,
  OutlookCalendarProvider,
  PipedriveOAuthProvider,
  SalesforceOAuthProvider,
  TeamsBotProvider,
  TeamsMeetingProvider,
  ZoomMeetingProvider,
} from "./providers";
import { RepProfileModule } from "./rep-profile";
import { SalesGoalRepository } from "./sales-goal.repository";
import { MongoSalesGoalRepository } from "./sales-goal.repository.mongo";
import { BookingLinkSchema } from "./schemas/booking-link.schema";
import { CalendarColorSchema } from "./schemas/calendar-color.schema";
import { CalendarConnectionSchema } from "./schemas/calendar-connection.schema";
import { CalendarEventSchema } from "./schemas/calendar-event.schema";
import { CrmConfigSchema } from "./schemas/crm-config.schema";
import { CrmSyncLogSchema } from "./schemas/crm-sync-log.schema";
import { CustomFieldDefinitionSchema } from "./schemas/custom-field-definition.schema";
import { MeetingSchema } from "./schemas/meeting.schema";
import { MeetingPlatformConnectionSchema } from "./schemas/meeting-platform-connection.schema";
import { MeetingRecordingSchema } from "./schemas/meeting-recording.schema";
import { MeetingTranscriptSchema } from "./schemas/meeting-transcript.schema";
import { OrganizationSchema } from "./schemas/organization.schema";
import { PlatformMeetingRecordSchema } from "./schemas/platform-meeting-record.schema";
import { ProspectSchema } from "./schemas/prospect.schema";
import { ProspectActivitySchema } from "./schemas/prospect-activity.schema";
import { SalesGoalSchema } from "./schemas/sales-goal.schema";
import { SyncConflictSchema } from "./schemas/sync-conflict.schema";
import { TeamActivitySchema } from "./schemas/team-activity.schema";
import { TeamInvitationSchema } from "./schemas/team-invitation.schema";
import { TeamMemberSchema } from "./schemas/team-member.schema";
import { TeamsBotSessionSchema } from "./schemas/teams-bot-session.schema";
import { TerritorySchema } from "./schemas/territory.schema";
import { VisitSchema } from "./schemas/visit.schema";
import {
  AnalyticsService,
  BookingService,
  CalendarColorService,
  CalendarService,
  CalendarSyncService,
  CalendarWebhookService,
  CrmService,
  CrmSyncService,
  CustomFieldService,
  FollowUpReminderService,
  GoalsService,
  MeetingPlatformService,
  MeetingSchedulerService,
  MeetingService,
  MeetingSummaryService,
  OrganizationService,
  PdfGenerationService,
  PlatformRecordingService,
  ProspectActivityService,
  ProspectHandoffService,
  ProspectService,
  RecordingService,
  RecurringMeetingService,
  ReportsService,
  RoutePlanningService,
  SpeakerDiarizationService,
  TeamActivityService,
  TeamAnalyticsService,
  TeamInvitationService,
  TeamService,
  TeamsBotAudioService,
  TeamsBotService,
  TerritoryService,
  TranscriptionService,
  VisitService,
} from "./services";
import { SyncConflictRepository } from "./sync-conflict.repository";
import { MongoSyncConflictRepository } from "./sync-conflict.repository.mongo";
import { TeamActivityRepository } from "./team-activity.repository";
import { MongoTeamActivityRepository } from "./team-activity.repository.mongo";
import { TeamInvitationRepository } from "./team-invitation.repository";
import { MongoTeamInvitationRepository } from "./team-invitation.repository.mongo";
import { TeamMemberRepository } from "./team-member.repository";
import { MongoTeamMemberRepository } from "./team-member.repository.mongo";
import { TeamsBotSessionRepository } from "./teams-bot-session.repository";
import { MongoTeamsBotSessionRepository } from "./teams-bot-session.repository.mongo";
import { TerritoryRepository } from "./territory.repository";
import { MongoTerritoryRepository } from "./territory.repository.mongo";
import { VisitRepository } from "./visit.repository";
import { MongoVisitRepository } from "./visit.repository.mongo";
import { VoiceFilterModule } from "./voice-filter";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "BookingLink", schema: BookingLinkSchema },
      { name: "Prospect", schema: ProspectSchema },
      { name: "ProspectActivity", schema: ProspectActivitySchema },
      { name: "CustomFieldDefinition", schema: CustomFieldDefinitionSchema },
      { name: "Visit", schema: VisitSchema },
      { name: "Meeting", schema: MeetingSchema },
      { name: "MeetingRecording", schema: MeetingRecordingSchema },
      { name: "MeetingTranscript", schema: MeetingTranscriptSchema },
      { name: "MeetingPlatformConnection", schema: MeetingPlatformConnectionSchema },
      { name: "PlatformMeetingRecord", schema: PlatformMeetingRecordSchema },
      { name: "CalendarColor", schema: CalendarColorSchema },
      { name: "CalendarConnection", schema: CalendarConnectionSchema },
      { name: "CalendarEvent", schema: CalendarEventSchema },
      { name: "CrmConfig", schema: CrmConfigSchema },
      { name: "CrmSyncLog", schema: CrmSyncLogSchema },
      { name: "SalesGoal", schema: SalesGoalSchema },
      { name: "SyncConflict", schema: SyncConflictSchema },
      { name: "Organization", schema: OrganizationSchema },
      { name: "TeamMember", schema: TeamMemberSchema },
      { name: "Territory", schema: TerritorySchema },
      { name: "TeamInvitation", schema: TeamInvitationSchema },
      { name: "TeamActivity", schema: TeamActivitySchema },
      { name: "TeamsBotSession", schema: TeamsBotSessionSchema },
      { name: "User", schema: UserSchema },
    ]),
    StorageModule,
    ScheduleModule,
    AdminModule,
    EmailModule,
    RepProfileModule,
    VoiceFilterModule,
    AnnixRepAuthModule,
    DiscoveryModule,
    forwardRef(() => NixModule),
  ],
  controllers: [
    AnalyticsController,
    BookingController,
    GoalsController,
    ProspectController,
    CustomFieldController,
    VisitController,
    MeetingController,
    MeetingPlatformController,
    CalendarController,
    PublicBookingController,
    RecordingController,
    TranscriptController,
    SummaryController,
    CrmController,
    RouteController,
    ReportsController,
    OrganizationController,
    TeamController,
    TeamInvitationController,
    TerritoryController,
    ProspectHandoffController,
    TeamActivityController,
    ManagerDashboardController,
    PlatformWebhookController,
    TeamsBotController,
    TeamsBotWebhookController,
    TeamsBotGateway,
  ],
  providers: [
    AnalyticsService,
    BookingService,
    CalendarColorService,
    CalendarWebhookService,
    FollowUpReminderService,
    GoalsService,
    MeetingPlatformService,
    MeetingSchedulerService,
    PlatformRecordingService,
    ProspectActivityService,
    ProspectService,
    CustomFieldService,
    VisitService,
    MeetingService,
    RecurringMeetingService,
    CalendarService,
    CalendarSyncService,
    RecordingService,
    SpeakerDiarizationService,
    TranscriptionService,
    MeetingSummaryService,
    CrmService,
    CrmSyncService,
    RoutePlanningService,
    ReportsService,
    PdfGenerationService,
    GoogleCalendarProvider,
    GoogleMeetProvider,
    OutlookCalendarProvider,
    CaldavCalendarProvider,
    SalesforceOAuthProvider,
    HubSpotOAuthProvider,
    PipedriveOAuthProvider,
    ZoomMeetingProvider,
    TeamsMeetingProvider,
    TeamsBotProvider,
    TeamsBotService,
    TeamsBotAudioService,
    TeamsBotGateway,
    OrganizationService,
    TeamService,
    TerritoryService,
    TeamInvitationService,
    TeamActivityService,
    ProspectHandoffService,
    TeamAnalyticsService,
    AnnixRepCapabilities,
    repositoryProvider(BookingLinkRepository, MongoBookingLinkRepository),
    repositoryProvider(ProspectRepository, MongoProspectRepository),
    repositoryProvider(ProspectActivityRepository, MongoProspectActivityRepository),
    repositoryProvider(CustomFieldDefinitionRepository, MongoCustomFieldDefinitionRepository),
    repositoryProvider(VisitRepository, MongoVisitRepository),
    repositoryProvider(MeetingRepository, MongoMeetingRepository),
    repositoryProvider(MeetingRecordingRepository, MongoMeetingRecordingRepository),
    repositoryProvider(MeetingTranscriptRepository, MongoMeetingTranscriptRepository),
    repositoryProvider(
      MeetingPlatformConnectionRepository,
      MongoMeetingPlatformConnectionRepository,
    ),
    repositoryProvider(PlatformMeetingRecordRepository, MongoPlatformMeetingRecordRepository),
    repositoryProvider(CalendarColorRepository, MongoCalendarColorRepository),
    repositoryProvider(CalendarConnectionRepository, MongoCalendarConnectionRepository),
    repositoryProvider(CalendarEventRepository, MongoCalendarEventRepository),
    repositoryProvider(CrmConfigRepository, MongoCrmConfigRepository),
    repositoryProvider(CrmSyncLogRepository, MongoCrmSyncLogRepository),
    repositoryProvider(SalesGoalRepository, MongoSalesGoalRepository),
    repositoryProvider(SyncConflictRepository, MongoSyncConflictRepository),
    repositoryProvider(OrganizationRepository, MongoOrganizationRepository),
    repositoryProvider(TeamMemberRepository, MongoTeamMemberRepository),
    repositoryProvider(TerritoryRepository, MongoTerritoryRepository),
    repositoryProvider(TeamInvitationRepository, MongoTeamInvitationRepository),
    repositoryProvider(TeamActivityRepository, MongoTeamActivityRepository),
    repositoryProvider(TeamsBotSessionRepository, MongoTeamsBotSessionRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
  ],
  exports: [
    ProspectService,
    VisitService,
    MeetingService,
    MeetingPlatformService,
    PlatformRecordingService,
    CalendarService,
    RecordingService,
    TranscriptionService,
    MeetingSummaryService,
    CrmService,
    RepProfileModule,
    AnnixRepAuthModule,
  ],
})
export class AnnixRepModule {}
