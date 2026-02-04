import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SteelSpecificationModule } from './steel-specification/steel-specification.module';
import { NominalOutsideDiameterMmModule } from './nominal-outside-diameter-mm/nominal-outside-diameter-mm.module';
import { UserModule } from './user/user.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { AuthModule } from './auth/auth.module';
import { PipeDimensionModule } from './pipe-dimension/pipe-dimension.module';
import { PipePressureModule } from './pipe-pressure/pipe-pressure.module';
import { AngleRangeModule } from './angle-range/angle-range.module';
import { FittingModule } from './fitting/fitting.module';
import { FittingBoreModule } from './fitting-bore/fitting-bore.module';
import { FittingDimensionModule } from './fitting-dimension/fitting-dimension.module';
import { FittingTypeModule } from './fitting-type/fitting-type.module';
import { FittingVariantModule } from './fitting-variant/fitting-variant.module';
import { FlangeStandardModule } from './flange-standard/flange-standard.module';
import { FlangePressureClassModule } from './flange-pressure-class/flange-pressure-class.module';
import { FlangePtRatingModule } from './flange-pt-rating/flange-pt-rating.module';
import { FlangeBoltingModule } from './flange-bolting/flange-bolting.module';
import { FlangeTypeModule } from './flange-type/flange-type.module';
import { SpectacleBlindModule } from './spectacle-blind/spectacle-blind.module';
import { PipeScheduleModule } from './pipe-schedule/pipe-schedule.module';
import { BoltModule } from './bolt/bolt.module';
import { BoltMassModule } from './bolt-mass/bolt-mass.module';
import { FlangeDimensionModule } from './flange-dimension/flange-dimension.module';
import { NutMassModule } from './nut-mass/nut-mass.module';
import { WasherModule } from './washer/washer.module';
import { NbNpsLookupModule } from './nb-nps-lookup/nb-nps-lookup.module';
import { BendDimensionService } from './bend-dimension/bend-dimension.service';
import { BendDimensionController } from './bend-dimension/bend-dimension.controller';
import { BendDimensionModule } from './bend-dimension/bend-dimension.module';
import { WeldTypeModule } from './weld-type/weld-type.module';
import { WeldJointEfficiencyModule } from './weld-joint-efficiency/weld-joint-efficiency.module';
import { WeldThicknessModule } from './weld-thickness/weld-thickness.module';
import { MaterialValidationModule } from './material-validation/material-validation.module';
import { GasketWeightModule } from './gasket-weight/gasket-weight.module';
import { PipeEndConfigurationModule } from './pipe-end-configuration/pipe-end-configuration.module';
import { BendCenterToFaceModule } from './bend-center-to-face/bend-center-to-face.module';
import { SweepTeeDimensionModule } from './sweep-tee-dimension/sweep-tee-dimension.module';
import { RfqModule } from './rfq/rfq.module';
// Phase 2 modules
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';
import { DrawingsModule } from './drawings/drawings.module';
import { BoqModule } from './boq/boq.module';
import { WorkflowModule } from './workflow/workflow.module';
import { CustomerModule } from './customer/customer.module';
import { PublicModule } from './public/public.module';
import { EmailModule } from './email/email.module';
import { SupplierModule } from './supplier/supplier.module';
import { MinesModule } from './mines/mines.module';
import { CoatingSpecificationModule } from './coating-specification/coating-specification.module';
import { PipeSizingModule } from './pipe-sizing/pipe-sizing.module';
import { StructuralSteelModule } from './structural-steel/structural-steel.module';
import { HdpeModule } from './hdpe/hdpe.module';
import { PvcModule } from './pvc/pvc.module';
import { AdminModule } from './admin/admin.module';
import { NixModule } from './nix/nix.module';
import { RubberLiningModule } from './rubber-lining/rubber-lining.module';
import { PipeSteelWorkModule } from './pipe-steel-work/pipe-steel-work.module';
import { SecureDocumentsModule } from './secure-documents/secure-documents.module';
import { ThermalModule } from './thermal/thermal.module';
import { DataValidationModule } from './data-validation/data-validation.module';
import { UnifiedApiModule } from './unified-api/unified-api.module';
import { RemoteAccessModule } from './remote-access/remote-access.module';
import { FlangeTypeWeightModule } from './flange-type-weight/flange-type-weight.module';
import { BnwSetWeightModule } from './bnw-set-weight/bnw-set-weight.module';
import { RetainingRingWeightModule } from './retaining-ring-weight/retaining-ring-weight.module';
import { NbOdLookupModule } from './nb-od-lookup/nb-od-lookup.module';
import { MessagingModule } from './messaging/messaging.module';
import typeormConfig from './config/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(typeormConfig()),
    SteelSpecificationModule,
    NominalOutsideDiameterMmModule,
    UserModule,
    UserRolesModule,
    AuthModule,
    PipeDimensionModule,
    PipePressureModule,
    AngleRangeModule,
    FittingModule,
    FittingBoreModule,
    FittingDimensionModule,
    FittingTypeModule,
    FittingVariantModule,
    FlangeStandardModule,
    FlangePressureClassModule,
    FlangePtRatingModule,
    FlangeBoltingModule,
    FlangeTypeModule,
    SpectacleBlindModule,
    PipeScheduleModule,
    BoltModule,
    BoltMassModule,
    FlangeDimensionModule,
    NutMassModule,
    WasherModule,
    NbNpsLookupModule,
    BendDimensionModule,
    WeldTypeModule,
    WeldJointEfficiencyModule,
    WeldThicknessModule,
    MaterialValidationModule,
    GasketWeightModule,
    PipeEndConfigurationModule,
    BendCenterToFaceModule,
    SweepTeeDimensionModule,
    RfqModule,
    // Phase 2 modules
    StorageModule,
    AuditModule,
    DrawingsModule,
    BoqModule,
    WorkflowModule,
    CustomerModule,
    PublicModule,
    EmailModule,
    SupplierModule,
    MinesModule,
    CoatingSpecificationModule,
    PipeSizingModule,
    StructuralSteelModule,
    HdpeModule,
    PvcModule,
    AdminModule,
    NixModule,
    RubberLiningModule,
    PipeSteelWorkModule,
    SecureDocumentsModule,
    ThermalModule,
    DataValidationModule,
    UnifiedApiModule,
    RemoteAccessModule,
    FlangeTypeWeightModule,
    BnwSetWeightModule,
    RetainingRingWeightModule,
    NbOdLookupModule,
    MessagingModule,
  ],
  controllers: [AppController, BendDimensionController],
  providers: [AppService, BendDimensionService],
})
export class AppModule {}
