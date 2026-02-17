import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { FieldFlowAuthModule } from "./auth";
import {
  CalendarController,
  CrmController,
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
  Visit,
} from "./entities";
import {
  CaldavCalendarProvider,
  GoogleCalendarProvider,
  OutlookCalendarProvider,
} from "./providers";
import { RepProfileModule } from "./rep-profile";
import {
  CalendarService,
  CalendarSyncService,
  CrmService,
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
    ]),
    ScheduleModule.forRoot(),
    AdminModule,
    RepProfileModule,
    FieldFlowAuthModule,
  ],
  controllers: [
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
