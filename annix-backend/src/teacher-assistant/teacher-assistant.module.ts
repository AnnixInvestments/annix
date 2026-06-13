import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { RbacBridgeModule } from "../rbac/rbac-bridge.module";
import { SharedModule } from "../shared/shared.module";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { TeacherAssistantCapabilities } from "./capabilities/teacher-assistant.capabilities";
import { TeacherAssistantUser } from "./entities/teacher-assistant-user.entity";
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
import { PostgresTeacherAssistantUserRepository } from "./teacher-assistant-user.repository.postgres";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "TeacherAssistantUser", schema: TeacherAssistantUserSchema },
            { name: "User", schema: UserSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([TeacherAssistantUser, User])]),
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
    repositoryProvider(
      TeacherAssistantUserRepository,
      PostgresTeacherAssistantUserRepository,
      MongoTeacherAssistantUserRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
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
