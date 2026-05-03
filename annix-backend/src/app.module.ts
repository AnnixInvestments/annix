import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiUsageModule } from "./ai-usage/ai-usage.module";
import { AppController } from "./app.controller";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BendDimensionController } from "./bend-dimension/bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension/bend-dimension.service";
import { BoqModule } from "./boq/boq.module";
import { ComplySaModule } from "./comply-sa/comply-sa.module";
import typeormConfig from "./config/typeorm";
import { CustomerModule } from "./customer/customer.module";
import { DataValidationModule } from "./data-validation/data-validation.module";
import { DrawingsModule } from "./drawings/drawings.module";
import { EmailModule } from "./email/email.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { HdpeModule } from "./hdpe/hdpe.module";
import { HeavyFeaturesModule } from "./heavy-features";
import { InboundEmailModule } from "./inbound-email/inbound-email.module";
import { MessagingModule } from "./messaging/messaging.module";
import { MetricsModule } from "./metrics/metrics.module";
import { NominalOutsideDiameterMmModule } from "./nominal-outside-diameter-mm/nominal-outside-diameter-mm.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PasskeyModule } from "./passkey/passkey.module";
import { PipeSteelWorkModule } from "./pipe-steel-work/pipe-steel-work.module";
import { PlatformModule } from "./platform/platform.module";
import { PublicModule } from "./public/public.module";
import { PvcModule } from "./pvc/pvc.module";
import { RbacModule } from "./rbac/rbac.module";
import { ReferenceDataModule } from "./reference-data";
import { RemoteAccessModule } from "./remote-access/remote-access.module";
import { RfqModule } from "./rfq/rfq.module";
import { AuthSharedModule } from "./shared/auth/auth-shared.module";
import { SharedModule } from "./shared/shared.module";
import { SteelSpecificationModule } from "./steel-specification/steel-specification.module";
import { StorageModule } from "./storage/storage.module";
import { StructuralSteelModule } from "./structural-steel/structural-steel.module";
import { SupplierModule } from "./supplier/supplier.module";
import { TeacherAssistantModule } from "./teacher-assistant/teacher-assistant.module";
import { UnifiedApiModule } from "./unified-api/unified-api.module";
import { UserModule } from "./user/user.module";
import { UserRolesModule } from "./user-roles/user-roles.module";
import { UserSyncModule } from "./user-sync/user-sync.module";
import { WorkflowModule } from "./workflow/workflow.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60000,
          limit: 100,
        },
        {
          name: "upload",
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    TypeOrmModule.forRoot({
      ...typeormConfig(),
      retryAttempts: 5,
      retryDelay: 3000,
    }),

    AiUsageModule,

    SharedModule,
    AuthSharedModule,
    AuthModule,
    PasskeyModule,
    UserModule,
    UserRolesModule,
    RbacModule,

    StorageModule,
    EmailModule,
    NotificationsModule,
    AuditModule,
    InboundEmailModule,

    ReferenceDataModule,

    SteelSpecificationModule,
    NominalOutsideDiameterMmModule,

    RfqModule,
    BoqModule,
    CustomerModule,
    SupplierModule,
    DrawingsModule,
    WorkflowModule,

    PublicModule,
    FeatureFlagsModule,
    DataValidationModule,
    UnifiedApiModule,
    RemoteAccessModule,
    FeedbackModule,
    MessagingModule,
    MetricsModule,
    TeacherAssistantModule,

    PipeSteelWorkModule,
    StructuralSteelModule,
    HdpeModule,
    PvcModule,

    UserSyncModule,

    PlatformModule,
    HeavyFeaturesModule,

    ...(process.env.DISABLE_COMPLY_SA === "true" ? [] : [ComplySaModule]),
  ],
  controllers: [AppController, BendDimensionController],
  providers: [BendDimensionService],
})
export class AppModule {}
