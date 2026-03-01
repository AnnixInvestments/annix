import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BendDimensionController } from "./bend-dimension/bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension/bend-dimension.service";
import { BoqModule } from "./boq/boq.module";
import typeormConfig from "./config/typeorm";
import { CustomerModule } from "./customer/customer.module";
import { DataValidationModule } from "./data-validation/data-validation.module";
import { DrawingsModule } from "./drawings/drawings.module";
import { EmailModule } from "./email/email.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { HdpeModule } from "./hdpe/hdpe.module";
import { HeavyFeaturesModule } from "./heavy-features";
import { MessagingModule } from "./messaging/messaging.module";
import { NominalOutsideDiameterMmModule } from "./nominal-outside-diameter-mm/nominal-outside-diameter-mm.module";
import { PipeSteelWorkModule } from "./pipe-steel-work/pipe-steel-work.module";
import { PublicModule } from "./public/public.module";
import { PvcModule } from "./pvc/pvc.module";
import { RbacModule } from "./rbac/rbac.module";
import { ReferenceDataModule } from "./reference-data";
import { RemoteAccessModule } from "./remote-access/remote-access.module";
import { RfqModule } from "./rfq/rfq.module";
import { AuthSharedModule } from "./shared/auth/auth-shared.module";
import { SteelSpecificationModule } from "./steel-specification/steel-specification.module";
import { StorageModule } from "./storage/storage.module";
import { StructuralSteelModule } from "./structural-steel/structural-steel.module";
import { SupplierModule } from "./supplier/supplier.module";
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
    TypeOrmModule.forRoot(typeormConfig()),

    AuthSharedModule,
    AuthModule,
    UserModule,
    UserRolesModule,
    RbacModule,

    StorageModule,
    EmailModule,
    AuditModule,

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

    PipeSteelWorkModule,
    StructuralSteelModule,
    HdpeModule,
    PvcModule,

    UserSyncModule,

    HeavyFeaturesModule,
  ],
  controllers: [AppController, BendDimensionController],
  providers: [AppService, BendDimensionService],
})
export class AppModule {}
