import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../email/email.module";
import { NixModule } from "../nix/nix.module";
import { CvAssistantAuthController } from "./controllers/auth.controller";
import { CandidateController } from "./controllers/candidate.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { JobPostingController } from "./controllers/job-posting.controller";
import { ReferenceFeedbackController } from "./controllers/reference-feedback.controller";
import { ReferencesController } from "./controllers/references.controller";
import { SettingsController } from "./controllers/settings.controller";
import { Candidate } from "./entities/candidate.entity";
import { CandidateReference } from "./entities/candidate-reference.entity";
import { CvAssistantCompany } from "./entities/cv-assistant-company.entity";
import { CvAssistantUser } from "./entities/cv-assistant-user.entity";
import { JobPosting } from "./entities/job-posting.entity";
import { CvAssistantAuthGuard } from "./guards/cv-assistant-auth.guard";
import { CvAssistantRoleGuard } from "./guards/cv-assistant-role.guard";
import { CvAssistantAuthService } from "./services/auth.service";
import { CandidateService } from "./services/candidate.service";
import { CvExtractionService } from "./services/cv-extraction.service";
import { EmailMonitorService } from "./services/email-monitor.service";
import { JobMatchService } from "./services/job-match.service";
import { JobPostingService } from "./services/job-posting.service";
import { ReferenceService } from "./services/reference.service";
import { SettingsService } from "./services/settings.service";
import { WorkflowAutomationService } from "./services/workflow-automation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CvAssistantUser,
      CvAssistantCompany,
      JobPosting,
      Candidate,
      CandidateReference,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("CV_ASSISTANT_JWT_SECRET", "cv-assistant-jwt-secret"),
        signOptions: { expiresIn: "1h" },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    NixModule,
    EmailModule,
  ],
  controllers: [
    CvAssistantAuthController,
    JobPostingController,
    CandidateController,
    ReferenceFeedbackController,
    DashboardController,
    SettingsController,
    ReferencesController,
  ],
  providers: [
    CvAssistantAuthGuard,
    CvAssistantRoleGuard,
    CvAssistantAuthService,
    JobPostingService,
    CandidateService,
    CvExtractionService,
    JobMatchService,
    ReferenceService,
    EmailMonitorService,
    WorkflowAutomationService,
    SettingsService,
  ],
})
export class CvAssistantModule {}
