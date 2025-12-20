import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
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
import { BoltModule } from './bolt/bolt.module';
import { BoltMassModule } from './bolt-mass/bolt-mass.module';
import { FlangeDimensionModule } from './flange-dimension/flange-dimension.module';
import { NutMassModule } from './nut-mass/nut-mass.module';
import { NbNpsLookupModule } from './nb-nps-lookup/nb-nps-lookup.module';
import { BendDimensionService } from './bend-dimension/bend-dimension.service';
import { BendDimensionController } from './bend-dimension/bend-dimension.controller';
import { BendDimensionModule } from './bend-dimension/bend-dimension.module';
import { WeldTypeModule } from './weld-type/weld-type.module';
import { PipeEndConfigurationModule } from './pipe-end-configuration/pipe-end-configuration.module';
import { BendCenterToFaceModule } from './bend-center-to-face/bend-center-to-face.module';
import { RfqModule } from './rfq/rfq.module';
// Phase 2 modules
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';
import { DrawingsModule } from './drawings/drawings.module';
import { BoqModule } from './boq/boq.module';
import { WorkflowModule } from './workflow/workflow.module';
import typeormConfig from './config/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    BoltModule,
    BoltMassModule,
    FlangeDimensionModule,
    NutMassModule,
    NbNpsLookupModule,
    BendDimensionModule,
    WeldTypeModule,
    PipeEndConfigurationModule,
    BendCenterToFaceModule,
    RfqModule,
    // Phase 2 modules
    StorageModule,
    AuditModule,
    DrawingsModule,
    BoqModule,
    WorkflowModule,
  ],
  controllers: [AppController, BendDimensionController],
  providers: [AppService, BendDimensionService],
})
export class AppModule {}
