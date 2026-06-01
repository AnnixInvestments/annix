import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NixModule } from "../nix/nix.module";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { AnnixRepAuthModule } from "./auth";
import { BookingLinkRepository } from "./booking-link.repository";
import { MongoBookingLinkRepository } from "./booking-link.repository.mongo";
import { PostgresBookingLinkRepository } from "./booking-link.repository.postgres";
import { CalendarColorRepository } from "./calendar-color.repository";
import { MongoCalendarColorRepository } from "./calendar-color.repository.mongo";
import { PostgresCalendarColorRepository } from "./calendar-color.repository.postgres";
import { CalendarConnectionRepository } from "./calendar-connection.repository";
import { MongoCalendarConnectionRepository } from "./calendar-connection.repository.mongo";
import { PostgresCalendarConnectionRepository } from "./calendar-connection.repository.postgres";
import { CalendarEventRepository } from "./calendar-event.repository";
import { MongoCalendarEventRepository } from "./calendar-event.repository.mongo";
import { PostgresCalendarEventRepository } from "./calendar-event.repository.postgres";
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
import { PostgresCrmConfigRepository } from "./crm-config.repository.postgres";
import { CrmSyncLogRepository } from "./crm-sync-log.repository";
import { MongoCrmSyncLogRepository } from "./crm-sync-log.repository.mongo";
import { PostgresCrmSyncLogRepository } from "./crm-sync-log.repository.postgres";
import { CustomFieldDefinitionRepository } from "./custom-field-definition.repository";
import { MongoCustomFieldDefinitionRepository } from "./custom-field-definition.repository.mongo";
import { PostgresCustomFieldDefinitionRepository } from "./custom-field-definition.repository.postgres";
import { DiscoveryModule } from "./discovery";
import {
  BookingLink,
  CalendarColor,
  CalendarConnection,
  CalendarEvent,
  CrmConfig,
  CrmSyncLog,
  CustomFieldDefinition,
  Meeting,
  MeetingPlatformConnection,
  MeetingRecording,
  MeetingTranscript,
  Organization,
  PlatformMeetingRecord,
  Prospect,
  ProspectActivity,
  SalesGoal,
  SyncConflict,
  TeamActivity,
  TeamInvitation,
  TeamMember,
  TeamsBotSession,
  Territory,
  Visit,
} from "./entities";
import { TeamsBotGateway } from "./gateways/teams-bot.gateway";
import { MeetingRepository } from "./meeting.repository";
import { MongoMeetingRepository } from "./meeting.repository.mongo";
import { PostgresMeetingRepository } from "./meeting.repository.postgres";
import { MeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository";
import { MongoMeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository.mongo";
import { PostgresMeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository.postgres";
import { MeetingRecordingRepository } from "./meeting-recording.repository";
import { MongoMeetingRecordingRepository } from "./meeting-recording.repository.mongo";
import { PostgresMeetingRecordingRepository } from "./meeting-recording.repository.postgres";
import { MeetingTranscriptRepository } from "./meeting-transcript.repository";
import { MongoMeetingTranscriptRepository } from "./meeting-transcript.repository.mongo";
import { PostgresMeetingTranscriptRepository } from "./meeting-transcript.repository.postgres";
import { OrganizationRepository } from "./organization.repository";
import { MongoOrganizationRepository } from "./organization.repository.mongo";
import { PostgresOrganizationRepository } from "./organization.repository.postgres";
import { PlatformMeetingRecordRepository } from "./platform-meeting-record.repository";
import { MongoPlatformMeetingRecordRepository } from "./platform-meeting-record.repository.mongo";
import { PostgresPlatformMeetingRecordRepository } from "./platform-meeting-record.repository.postgres";
import { ProspectRepository } from "./prospect.repository";
import { MongoProspectRepository } from "./prospect.repository.mongo";
import { PostgresProspectRepository } from "./prospect.repository.postgres";
import { ProspectActivityRepository } from "./prospect-activity.repository";
import { MongoProspectActivityRepository } from "./prospect-activity.repository.mongo";
import { PostgresProspectActivityRepository } from "./prospect-activity.repository.postgres";
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
import { PostgresSalesGoalRepository } from "./sales-goal.repository.postgres";
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
import { PostgresSyncConflictRepository } from "./sync-conflict.repository.postgres";
import { TeamActivityRepository } from "./team-activity.repository";
import { MongoTeamActivityRepository } from "./team-activity.repository.mongo";
import { PostgresTeamActivityRepository } from "./team-activity.repository.postgres";
import { TeamInvitationRepository } from "./team-invitation.repository";
import { MongoTeamInvitationRepository } from "./team-invitation.repository.mongo";
import { PostgresTeamInvitationRepository } from "./team-invitation.repository.postgres";
import { TeamMemberRepository } from "./team-member.repository";
import { MongoTeamMemberRepository } from "./team-member.repository.mongo";
import { PostgresTeamMemberRepository } from "./team-member.repository.postgres";
import { TeamsBotSessionRepository } from "./teams-bot-session.repository";
import { MongoTeamsBotSessionRepository } from "./teams-bot-session.repository.mongo";
import { PostgresTeamsBotSessionRepository } from "./teams-bot-session.repository.postgres";
import { TerritoryRepository } from "./territory.repository";
import { MongoTerritoryRepository } from "./territory.repository.mongo";
import { PostgresTerritoryRepository } from "./territory.repository.postgres";
import { VisitRepository } from "./visit.repository";
import { MongoVisitRepository } from "./visit.repository.mongo";
import { PostgresVisitRepository } from "./visit.repository.postgres";
import { VoiceFilterModule } from "./voice-filter";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            BookingLink,
            Prospect,
            ProspectActivity,
            CustomFieldDefinition,
            Visit,
            Meeting,
            MeetingRecording,
            MeetingTranscript,
            MeetingPlatformConnection,
            PlatformMeetingRecord,
            CalendarColor,
            CalendarConnection,
            CalendarEvent,
            CrmConfig,
            CrmSyncLog,
            SalesGoal,
            SyncConflict,
            User,
            Organization,
            TeamMember,
            Territory,
            TeamInvitation,
            TeamActivity,
            TeamsBotSession,
          ]),
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
    repositoryProvider(
      BookingLinkRepository,
      PostgresBookingLinkRepository,
      MongoBookingLinkRepository,
    ),
    repositoryProvider(ProspectRepository, PostgresProspectRepository, MongoProspectRepository),
    repositoryProvider(
      ProspectActivityRepository,
      PostgresProspectActivityRepository,
      MongoProspectActivityRepository,
    ),
    repositoryProvider(
      CustomFieldDefinitionRepository,
      PostgresCustomFieldDefinitionRepository,
      MongoCustomFieldDefinitionRepository,
    ),
    repositoryProvider(VisitRepository, PostgresVisitRepository, MongoVisitRepository),
    repositoryProvider(MeetingRepository, PostgresMeetingRepository, MongoMeetingRepository),
    repositoryProvider(
      MeetingRecordingRepository,
      PostgresMeetingRecordingRepository,
      MongoMeetingRecordingRepository,
    ),
    repositoryProvider(
      MeetingTranscriptRepository,
      PostgresMeetingTranscriptRepository,
      MongoMeetingTranscriptRepository,
    ),
    repositoryProvider(
      MeetingPlatformConnectionRepository,
      PostgresMeetingPlatformConnectionRepository,
      MongoMeetingPlatformConnectionRepository,
    ),
    repositoryProvider(
      PlatformMeetingRecordRepository,
      PostgresPlatformMeetingRecordRepository,
      MongoPlatformMeetingRecordRepository,
    ),
    repositoryProvider(
      CalendarColorRepository,
      PostgresCalendarColorRepository,
      MongoCalendarColorRepository,
    ),
    repositoryProvider(
      CalendarConnectionRepository,
      PostgresCalendarConnectionRepository,
      MongoCalendarConnectionRepository,
    ),
    repositoryProvider(
      CalendarEventRepository,
      PostgresCalendarEventRepository,
      MongoCalendarEventRepository,
    ),
    repositoryProvider(CrmConfigRepository, PostgresCrmConfigRepository, MongoCrmConfigRepository),
    repositoryProvider(
      CrmSyncLogRepository,
      PostgresCrmSyncLogRepository,
      MongoCrmSyncLogRepository,
    ),
    repositoryProvider(SalesGoalRepository, PostgresSalesGoalRepository, MongoSalesGoalRepository),
    repositoryProvider(
      SyncConflictRepository,
      PostgresSyncConflictRepository,
      MongoSyncConflictRepository,
    ),
    repositoryProvider(
      OrganizationRepository,
      PostgresOrganizationRepository,
      MongoOrganizationRepository,
    ),
    repositoryProvider(
      TeamMemberRepository,
      PostgresTeamMemberRepository,
      MongoTeamMemberRepository,
    ),
    repositoryProvider(TerritoryRepository, PostgresTerritoryRepository, MongoTerritoryRepository),
    repositoryProvider(
      TeamInvitationRepository,
      PostgresTeamInvitationRepository,
      MongoTeamInvitationRepository,
    ),
    repositoryProvider(
      TeamActivityRepository,
      PostgresTeamActivityRepository,
      MongoTeamActivityRepository,
    ),
    repositoryProvider(
      TeamsBotSessionRepository,
      PostgresTeamsBotSessionRepository,
      MongoTeamsBotSessionRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
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
