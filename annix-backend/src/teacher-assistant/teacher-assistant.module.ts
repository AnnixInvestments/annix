import { forwardRef, Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { SharedModule } from "../shared/shared.module";
import { StorageModule } from "../storage/storage.module";
import { AssignmentDocxService } from "./services/assignment-docx.service";
import { AssignmentGeneratorService } from "./services/assignment-generator.service";
import { AssignmentPdfService } from "./services/assignment-pdf.service";
import { SubjectTemplateService } from "./services/subject-template.service";
import { TeacherAssistantController } from "./teacher-assistant.controller";

@Module({
  imports: [
    forwardRef(() => AdminModule),
    forwardRef(() => NixModule),
    MetricsModule,
    SharedModule,
    StorageModule,
  ],
  controllers: [TeacherAssistantController],
  providers: [
    AssignmentGeneratorService,
    AssignmentPdfService,
    AssignmentDocxService,
    SubjectTemplateService,
  ],
  exports: [
    AssignmentGeneratorService,
    AssignmentPdfService,
    AssignmentDocxService,
    SubjectTemplateService,
  ],
})
export class TeacherAssistantModule {}
