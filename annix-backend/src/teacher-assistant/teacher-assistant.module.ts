import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { SharedModule } from "../shared/shared.module";
import { StorageModule } from "../storage/storage.module";
import { TeacherAssistantUser } from "./entities/teacher-assistant-user.entity";
import { TeacherAssistantAuthGuard } from "./guards/teacher-assistant-auth.guard";
import { AssignmentDocxService } from "./services/assignment-docx.service";
import { AssignmentGeneratorService } from "./services/assignment-generator.service";
import { AssignmentPdfService } from "./services/assignment-pdf.service";
import { ObjectiveSuggesterService } from "./services/objective-suggester.service";
import { SubjectTemplateService } from "./services/subject-template.service";
import { TeacherAssistantAuthService } from "./services/teacher-assistant-auth.service";
import { TeacherAssistantController } from "./teacher-assistant.controller";
import { TeacherAssistantAuthController } from "./teacher-assistant-auth.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherAssistantUser]),
    forwardRef(() => AdminModule),
    forwardRef(() => NixModule),
    MetricsModule,
    SharedModule,
    StorageModule,
  ],
  controllers: [TeacherAssistantController, TeacherAssistantAuthController],
  providers: [
    AssignmentGeneratorService,
    AssignmentPdfService,
    AssignmentDocxService,
    ObjectiveSuggesterService,
    SubjectTemplateService,
    TeacherAssistantAuthService,
    TeacherAssistantAuthGuard,
  ],
  exports: [
    AssignmentGeneratorService,
    AssignmentPdfService,
    AssignmentDocxService,
    ObjectiveSuggesterService,
    SubjectTemplateService,
    TeacherAssistantAuthService,
    TeacherAssistantAuthGuard,
  ],
})
export class TeacherAssistantModule {}
