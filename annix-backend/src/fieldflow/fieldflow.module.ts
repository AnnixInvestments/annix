import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { FieldFlowAuthModule } from "./auth";
import {
  AnalyticsController,
  CalendarController,
  CrmController,
  GoalsController,
  MeetingController,
  ProspectController,
  RecordingController,
  RouteController,
  SummaryController,
  TranscriptController,
  VisitController,
} from "./controllers";
import {
  CalendarConnection,
  CalendarEvent,
  CrmConfig,
  Meeting,
  MeetingRecording,
  MeetingTranscript,
  Prospect,
  SalesGoal,
  Visit,
} from "./entities";
import {
  CaldavCalendarProvider,
  GoogleCalendarProvider,
  OutlookCalendarProvider,
} from "./providers";
import { RepProfileModule } from "./rep-profile";
import {
  AnalyticsService,
  CalendarService,
  CalendarSyncService,
  CrmService,
  GoalsService,
  MeetingService,
  MeetingSummaryService,
  ProspectService,
  RecordingService,
  RoutePlanningService,
  SpeakerDiarizationService,
  TranscriptionService,
  VisitService,
} from "./services";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prospect,
      Visit,
      Meeting,
      MeetingRecording,
      MeetingTranscript,
      CalendarConnection,
      CalendarEvent,
      CrmConfig,
      SalesGoal,
    ]),
    ScheduleModule.forRoot(),
    AdminModule,
    RepProfileModule,
    FieldFlowAuthModule,
  ],
  controllers: [
    AnalyticsController,
    GoalsController,
    ProspectController,
    VisitController,
    MeetingController,
    CalendarController,
    RecordingController,
    TranscriptController,
    SummaryController,
    CrmController,
    RouteController,
  ],
  providers: [
    AnalyticsService,
    GoalsService,
    ProspectService,
    VisitService,
    MeetingService,
    CalendarService,
    CalendarSyncService,
    RecordingService,
    SpeakerDiarizationService,
    TranscriptionService,
    MeetingSummaryService,
    CrmService,
    RoutePlanningService,
    GoogleCalendarProvider,
    OutlookCalendarProvider,
    CaldavCalendarProvider,
  ],
  exports: [
    ProspectService,
    VisitService,
    MeetingService,
    CalendarService,
    RecordingService,
    TranscriptionService,
    MeetingSummaryService,
    CrmService,
    RepProfileModule,
    FieldFlowAuthModule,
  ],
})
export class FieldFlowModule {}
