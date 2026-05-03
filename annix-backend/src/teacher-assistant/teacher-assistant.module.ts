import { forwardRef, Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { AssignmentGeneratorService } from "./services/assignment-generator.service";
import { SubjectTemplateService } from "./services/subject-template.service";
import { TeacherAssistantController } from "./teacher-assistant.controller";

@Module({
  imports: [forwardRef(() => AdminModule), forwardRef(() => NixModule), MetricsModule],
  controllers: [TeacherAssistantController],
  providers: [AssignmentGeneratorService, SubjectTemplateService],
  exports: [AssignmentGeneratorService, SubjectTemplateService],
})
export class TeacherAssistantModule {}
