import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerStorageService } from "@nestjs/throttler";
import { AiUsageModule } from "./ai-usage/ai-usage.module";
import { AnnixSentinelModule } from "./annix-sentinel/annix-sentinel.module";
import { AppController } from "./app.controller";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BendDimensionController } from "./bend-dimension/bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension/bend-dimension.service";
import { BoqModule } from "./boq/boq.module";
import { BrandingModule } from "./branding/branding.module";
import { CoreModule } from "./core/core.module";
import { CustomerModule } from "./customer/customer.module";
import { DrawingsModule } from "./drawings/drawings.module";
import { EmailModule } from "./email/email.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { FilesModule } from "./files/files.module";
import { HdpeModule } from "./hdpe/hdpe.module";
import { HeavyFeaturesModule } from "./heavy-features";
import { InboundEmailModule } from "./inbound-email/inbound-email.module";
import { InsightsModule } from "./insights/insights.module";
import { MongoConnectionModule } from "./lib/persistence/mongo-connection.module";
import { MongoMaintenanceModule } from "./lib/persistence/mongo-maintenance.module";
import { TransactionModule } from "./lib/persistence/transaction.module";
import { LicensingModule } from "./licensing/licensing.module";
import { MarketingModule } from "./marketing/marketing.module";
import { MessagingModule } from "./messaging/messaging.module";
import { MetricsModule } from "./metrics/metrics.module";
import { NbNpsLookupModule } from "./nb-nps-lookup/nb-nps-lookup.module";
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
import { GlobalThrottlerGuard } from "./shared/throttler/global-throttler.guard";
import { MongoThrottlerStorage } from "./shared/throttler/mongo-throttler-storage";
import { MongoThrottlerStorageModule } from "./shared/throttler/mongo-throttler-storage.module";
import { SsoModule } from "./sso/sso.module";
import { SteelSpecificationModule } from "./steel-specification/steel-specification.module";
import { StorageModule } from "./storage/storage.module";
import { StructuralSteelModule } from "./structural-steel/structural-steel.module";
import { SupplierModule } from "./supplier/supplier.module";
import { TeacherAssistantModule } from "./teacher-assistant/teacher-assistant.module";
import { UnifiedApiModule } from "./unified-api/unified-api.module";
import { UserModule } from "./user/user.module";
import { UserRolesModule } from "./user-roles/user-roles.module";
import { UserSyncModule } from "./user-sync/user-sync.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { WorkflowModule } from "./workflow/workflow.module";

const GLOBAL_THROTTLER_STORAGE = Symbol("GLOBAL_THROTTLER_STORAGE");

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [MongoThrottlerStorageModule],
      inject: [MongoThrottlerStorage],
      useFactory: (storage: MongoThrottlerStorage) => ({
        throttlers: [
          { name: "default", ttl: 60000, limit: 100 },
          { name: "upload", ttl: 60000, limit: 10 },
        ],
        storage,
      }),
    }),
    MongoConnectionModule,
    MongoMaintenanceModule,
    TransactionModule,

    AiUsageModule,

    SharedModule,
    AuthSharedModule,
    AuthModule,
    PasskeyModule,
    UserModule,
    UserRolesModule,
    RbacModule,

    StorageModule,
    FilesModule,
    EmailModule,
    NotificationsModule,
    WhatsAppModule,
    AuditModule,
    InboundEmailModule,

    ReferenceDataModule,

    SteelSpecificationModule,
    NominalOutsideDiameterMmModule,
    NbNpsLookupModule,

    RfqModule,
    BoqModule,
    CustomerModule,
    SupplierModule,
    DrawingsModule,
    WorkflowModule,

    PublicModule,
    FeatureFlagsModule,
    LicensingModule,
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
    CoreModule,
    HeavyFeaturesModule,

    InsightsModule,
    BrandingModule,
    MarketingModule,
    SsoModule,

    // AnnixSentinelModule (formerly Comply-SA) — ported to the Mongo repository
    // pattern (#371); loads on every driver. DISABLE_ANNIX_SENTINEL is the only
    // opt-out. Legacy Postgres data import is a separate task.
    ...(process.env.DISABLE_ANNIX_SENTINEL === "true" ? [] : [AnnixSentinelModule]),
  ],
  controllers: [AppController, BendDimensionController],
  providers: [
    BendDimensionService,
    {
      provide: GLOBAL_THROTTLER_STORAGE,
      useClass: ThrottlerStorageService,
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, storage: ThrottlerStorageService) =>
        new GlobalThrottlerGuard(
          { throttlers: [{ name: "global", ttl: 60000, limit: 600 }] },
          storage,
          reflector,
        ),
      inject: [Reflector, GLOBAL_THROTTLER_STORAGE],
    },
  ],
})
export class AppModule {}
