import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { RbacBridgeModule } from "../rbac/rbac-bridge.module";
import { SharedModule } from "../shared/shared.module";
import { StorageModule } from "../storage/storage.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { TeacherAssistantCapabilities } from "./capabilities/teacher-assistant.capabilities";
import { TeacherAssistantAuthGuard } from "./guards/teacher-assistant-auth.guard";
import { TeacherAssistantUserSchema } from "./schemas/teacher-assistant-user.schema";
import { AssignmentDocxService } from "./services/assignment-docx.service";
import { AssignmentGeneratorService } from "./services/assignment-generator.service";
import { AssignmentPdfService } from "./services/assignment-pdf.service";
import { ObjectiveSuggesterService } from "./services/objective-suggester.service";
import { SectionFillerService } from "./services/section-filler.service";
import { SubjectTemplateService } from "./services/subject-template.service";
import { TeacherAssistantAuthService } from "./services/teacher-assistant-auth.service";
import { TeacherAssistantController } from "./teacher-assistant.controller";
import { TeacherAssistantAuthController } from "./teacher-assistant-auth.controller";
import { TeacherAssistantUserRepository } from "./teacher-assistant-user.repository";
import { MongoTeacherAssistantUserRepository } from "./teacher-assistant-user.repository.mongo";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "TeacherAssistantUser", schema: TeacherAssistantUserSchema },
      { name: "User", schema: UserSchema },
    ]),
    forwardRef(() => AdminModule),
    forwardRef(() => NixModule),
    MetricsModule,
    RbacBridgeModule,
    SharedModule,
    StorageModule,
  ],
  controllers: [TeacherAssistantController, TeacherAssistantAuthController],
  providers: [
    AssignmentGeneratorService,
    AssignmentPdfService,
    AssignmentDocxService,
    ObjectiveSuggesterService,
    SectionFillerService,
    SubjectTemplateService,
    TeacherAssistantAuthService,
    TeacherAssistantAuthGuard,
    TeacherAssistantCapabilities,
    repositoryProvider(TeacherAssistantUserRepository, MongoTeacherAssistantUserRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
  ],
  exports: [
    AssignmentGeneratorService,
    AssignmentPdfService,
    AssignmentDocxService,
    ObjectiveSuggesterService,
    SectionFillerService,
    SubjectTemplateService,
    TeacherAssistantAuthService,
    TeacherAssistantAuthGuard,
  ],
})
export class TeacherAssistantModule {}
