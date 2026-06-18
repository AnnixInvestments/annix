import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { MongoBoltMassRepository } from "../bolt-mass/bolt-mass.repository.mongo";
import { PostgresBoltMassRepository } from "../bolt-mass/bolt-mass.repository.postgres";
import { BoltMass } from "../bolt-mass/entities/bolt-mass.entity";
import { BoltMassSchema } from "../bolt-mass/schemas/bolt-mass.schema";
import { BoqRepository } from "../boq/boq.repository";
import { MongoBoqRepository } from "../boq/boq.repository.mongo";
import { PostgresBoqRepository } from "../boq/boq.repository.postgres";
import { BoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository";
import { MongoBoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository.mongo";
import { PostgresBoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository.postgres";
import { Boq } from "../boq/entities/boq.entity";
import { BoqLineItem } from "../boq/entities/boq-line-item.entity";
import { BoqSupplierAccess } from "../boq/entities/boq-supplier-access.entity";
import { BoqSchema } from "../boq/schemas/boq.schema";
import { BoqLineItemSchema } from "../boq/schemas/boq-line-item.schema";
import { BoqSupplierAccessSchema } from "../boq/schemas/boq-supplier-access.schema";
import { CustomerModule } from "../customer/customer.module";
import { EmailModule } from "../email/email.module";
import { FittingModule } from "../fitting/fitting.module";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { MongoFlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository.mongo";
import { PostgresFlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository.postgres";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.mongo";
import { PostgresNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.postgres";
import { NbNpsLookupSchema } from "../nb-nps-lookup/schemas/nb-nps-lookup.schema";
import { NominalOutsideDiameterMm } from "../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { MongoNutMassRepository } from "../nut-mass/nut-mass.repository.mongo";
import { PostgresNutMassRepository } from "../nut-mass/nut-mass.repository.postgres";
import { NutMassSchema } from "../nut-mass/schemas/nut-mass.schema";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.mongo";
import { PostgresPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.postgres";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { PipePressureSchema } from "../pipe-pressure/schemas/pipe-pressure.schema";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { SteelSpecificationSchema } from "../steel-specification/schemas/steel-specification.schema";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { MongoSteelSpecificationRepository } from "../steel-specification/steel-specification.repository.mongo";
import { PostgresSteelSpecificationRepository } from "../steel-specification/steel-specification.repository.postgres";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { AnonymousDraftController } from "./anonymous-draft.controller";
import { AnonymousDraftRepository } from "./anonymous-draft.repository";
import { MongoAnonymousDraftRepository } from "./anonymous-draft.repository.mongo";
import { PostgresAnonymousDraftRepository } from "./anonymous-draft.repository.postgres";
import { AnonymousDraftService } from "./anonymous-draft.service";
import { BendRfqRepository } from "./bend-rfq.repository";
import { MongoBendRfqRepository } from "./bend-rfq.repository.mongo";
import { PostgresBendRfqRepository } from "./bend-rfq.repository.postgres";
import { AnonymousDraft } from "./entities/anonymous-draft.entity";
import { BendRfq } from "./entities/bend-rfq.entity";
import { ExpansionJointRfq } from "./entities/expansion-joint-rfq.entity";
import { FastenerRfq } from "./entities/fastener-rfq.entity";
import { FittingRfq } from "./entities/fitting-rfq.entity";
import { InstrumentRfq } from "./entities/instrument-rfq.entity";
import { PumpRfq } from "./entities/pump-rfq.entity";
import { Rfq } from "./entities/rfq.entity";
import { RfqClarificationRequest } from "./entities/rfq-clarification-request.entity";
import { RfqDocument } from "./entities/rfq-document.entity";
import { RfqDraft } from "./entities/rfq-draft.entity";
import { RfqItem } from "./entities/rfq-item.entity";
import { RfqSequence } from "./entities/rfq-sequence.entity";
import { StraightPipeRfq } from "./entities/straight-pipe-rfq.entity";
import { TankChuteRfq } from "./entities/tank-chute-rfq.entity";
import { ValveRfq } from "./entities/valve-rfq.entity";
import { ExpansionJointRfqRepository } from "./expansion-joint-rfq.repository";
import { MongoExpansionJointRfqRepository } from "./expansion-joint-rfq.repository.mongo";
import { PostgresExpansionJointRfqRepository } from "./expansion-joint-rfq.repository.postgres";
import { FastenerRfqRepository } from "./fastener-rfq.repository";
import { MongoFastenerRfqRepository } from "./fastener-rfq.repository.mongo";
import { PostgresFastenerRfqRepository } from "./fastener-rfq.repository.postgres";
import { FittingRfqRepository } from "./fitting-rfq.repository";
import { MongoFittingRfqRepository } from "./fitting-rfq.repository.mongo";
import { PostgresFittingRfqRepository } from "./fitting-rfq.repository.postgres";
import { InstrumentRfqRepository } from "./instrument-rfq.repository";
import { MongoInstrumentRfqRepository } from "./instrument-rfq.repository.mongo";
import { PostgresInstrumentRfqRepository } from "./instrument-rfq.repository.postgres";
import { PumpRfqRepository } from "./pump-rfq.repository";
import { MongoPumpRfqRepository } from "./pump-rfq.repository.mongo";
import { PostgresPumpRfqRepository } from "./pump-rfq.repository.postgres";
import { RfqController } from "./rfq.controller";
import { RfqRepository } from "./rfq.repository";
import { MongoRfqRepository } from "./rfq.repository.mongo";
import { PostgresRfqRepository } from "./rfq.repository.postgres";
import { RfqService } from "./rfq.service";
import { RfqClarificationRequestRepository } from "./rfq-clarification-request.repository";
import { MongoRfqClarificationRequestRepository } from "./rfq-clarification-request.repository.mongo";
import { PostgresRfqClarificationRequestRepository } from "./rfq-clarification-request.repository.postgres";
import { RfqDocumentRepository } from "./rfq-document.repository";
import { MongoRfqDocumentRepository } from "./rfq-document.repository.mongo";
import { PostgresRfqDocumentRepository } from "./rfq-document.repository.postgres";
import { RfqDraftRepository } from "./rfq-draft.repository";
import { MongoRfqDraftRepository } from "./rfq-draft.repository.mongo";
import { PostgresRfqDraftRepository } from "./rfq-draft.repository.postgres";
import { RfqDraftService } from "./rfq-draft.service";
import { RfqItemRepository } from "./rfq-item.repository";
import { MongoRfqItemRepository } from "./rfq-item.repository.mongo";
import { PostgresRfqItemRepository } from "./rfq-item.repository.postgres";
import { RfqSequenceRepository } from "./rfq-sequence.repository";
import { MongoRfqSequenceRepository } from "./rfq-sequence.repository.mongo";
import { PostgresRfqSequenceRepository } from "./rfq-sequence.repository.postgres";
import { AnonymousDraftSchema } from "./schemas/anonymous-draft.schema";
import { BendRfqSchema } from "./schemas/bend-rfq.schema";
import { ExpansionJointRfqSchema } from "./schemas/expansion-joint-rfq.schema";
import { FastenerRfqSchema } from "./schemas/fastener-rfq.schema";
import { FittingRfqSchema } from "./schemas/fitting-rfq.schema";
import { InstrumentRfqSchema } from "./schemas/instrument-rfq.schema";
import { PipeSteelWorkRfqSchema } from "./schemas/pipe-steel-work-rfq.schema";
import { PumpRfqSchema } from "./schemas/pump-rfq.schema";
import { RfqSchema } from "./schemas/rfq.schema";
import { RfqClarificationRequestSchema } from "./schemas/rfq-clarification-request.schema";
import { RfqDocumentSchema } from "./schemas/rfq-document.schema";
import { RfqDraftSchema } from "./schemas/rfq-draft.schema";
import { RfqItemSchema } from "./schemas/rfq-item.schema";
import { RfqSequenceSchema } from "./schemas/rfq-sequence.schema";
import { StraightPipeRfqSchema } from "./schemas/straight-pipe-rfq.schema";
import { SurfaceProtectionRfqSchema } from "./schemas/surface-protection-rfq.schema";
import { TankChuteRfqSchema } from "./schemas/tank-chute-rfq.schema";
import { ValveRfqSchema } from "./schemas/valve-rfq.schema";
import { ReferenceDataCacheService } from "./services/reference-data-cache.service";
import { RfqCalculationService } from "./services/rfq-calculation.service";
import { RfqDocumentService } from "./services/rfq-document.service";
import { StraightPipeRfqRepository } from "./straight-pipe-rfq.repository";
import { MongoStraightPipeRfqRepository } from "./straight-pipe-rfq.repository.mongo";
import { PostgresStraightPipeRfqRepository } from "./straight-pipe-rfq.repository.postgres";
import { TankChuteRfqRepository } from "./tank-chute-rfq.repository";
import { MongoTankChuteRfqRepository } from "./tank-chute-rfq.repository.mongo";
import { PostgresTankChuteRfqRepository } from "./tank-chute-rfq.repository.postgres";
import { ValveRfqRepository } from "./valve-rfq.repository";
import { MongoValveRfqRepository } from "./valve-rfq.repository.mongo";
import { PostgresValveRfqRepository } from "./valve-rfq.repository.postgres";

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    EmailModule,
    FittingModule,
    FlangeTypeWeightModule,
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Rfq", schema: RfqSchema },
            { name: "RfqItem", schema: RfqItemSchema },
            { name: "StraightPipeRfq", schema: StraightPipeRfqSchema },
            { name: "BendRfq", schema: BendRfqSchema },
            { name: "FittingRfq", schema: FittingRfqSchema },
            { name: "ExpansionJointRfq", schema: ExpansionJointRfqSchema },
            { name: "ValveRfq", schema: ValveRfqSchema },
            { name: "InstrumentRfq", schema: InstrumentRfqSchema },
            { name: "PumpRfq", schema: PumpRfqSchema },
            { name: "TankChuteRfq", schema: TankChuteRfqSchema },
            { name: "FastenerRfq", schema: FastenerRfqSchema },
            { name: "PipeSteelWorkRfq", schema: PipeSteelWorkRfqSchema },
            { name: "SurfaceProtectionRfq", schema: SurfaceProtectionRfqSchema },
            { name: "RfqDocument", schema: RfqDocumentSchema },
            { name: "RfqDraft", schema: RfqDraftSchema },
            { name: "RfqClarificationRequest", schema: RfqClarificationRequestSchema },
            { name: "AnonymousDraft", schema: AnonymousDraftSchema },
            { name: "RfqSequence", schema: RfqSequenceSchema },
            { name: "User", schema: UserSchema },
            { name: "SteelSpecification", schema: SteelSpecificationSchema },
            { name: "PipeDimension", schema: PipeDimensionSchema },
            { name: "NbNpsLookup", schema: NbNpsLookupSchema },
            { name: "FlangeDimension", schema: FlangeDimensionSchema },
            { name: "BoltMass", schema: BoltMassSchema },
            { name: "NutMass", schema: NutMassSchema },
            { name: "Boq", schema: BoqSchema },
            { name: "BoqLineItem", schema: BoqLineItemSchema },
            { name: "BoqSupplierAccess", schema: BoqSupplierAccessSchema },
            { name: "SupplierProfile", schema: SupplierProfileSchema },
            { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
            { name: "PipePressure", schema: PipePressureSchema },
            { name: "FlangeStandard", schema: FlangeStandardSchema },
            { name: "FlangePressureClass", schema: FlangePressureClassSchema },
            { name: "Bolt", schema: BoltSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            Rfq,
            RfqItem,
            StraightPipeRfq,
            BendRfq,
            FittingRfq,
            ExpansionJointRfq,
            ValveRfq,
            InstrumentRfq,
            PumpRfq,
            TankChuteRfq,
            FastenerRfq,
            RfqDocument,
            RfqDraft,
            RfqClarificationRequest,
            AnonymousDraft,
            RfqSequence,
            User,
            SteelSpecification,
            PipeDimension,
            FlangeStandard,
            FlangePressureClass,
            FlangeDimension,
            BoltMass,
            NutMass,
            NbNpsLookup,
            Boq,
            BoqLineItem,
            BoqSupplierAccess,
            SupplierProfile,
            SupplierOnboarding,
            NominalOutsideDiameterMm,
            Bolt,
          ]),
        ]),
    MulterModule.register({
      limits: {
        // 50 MB
        fileSize: 50 * 1024 * 1024,
      },
    }),
  ],
  controllers: [RfqController, AnonymousDraftController],
  providers: [
    RfqService,
    RfqDraftService,
    RfqDocumentService,
    RfqCalculationService,
    AnonymousDraftService,
    ReferenceDataCacheService,
    repositoryProvider(RfqRepository, PostgresRfqRepository, MongoRfqRepository),
    repositoryProvider(RfqItemRepository, PostgresRfqItemRepository, MongoRfqItemRepository),
    repositoryProvider(
      StraightPipeRfqRepository,
      PostgresStraightPipeRfqRepository,
      MongoStraightPipeRfqRepository,
    ),
    repositoryProvider(BendRfqRepository, PostgresBendRfqRepository, MongoBendRfqRepository),
    repositoryProvider(
      FittingRfqRepository,
      PostgresFittingRfqRepository,
      MongoFittingRfqRepository,
    ),
    repositoryProvider(
      ExpansionJointRfqRepository,
      PostgresExpansionJointRfqRepository,
      MongoExpansionJointRfqRepository,
    ),
    repositoryProvider(ValveRfqRepository, PostgresValveRfqRepository, MongoValveRfqRepository),
    repositoryProvider(
      InstrumentRfqRepository,
      PostgresInstrumentRfqRepository,
      MongoInstrumentRfqRepository,
    ),
    repositoryProvider(PumpRfqRepository, PostgresPumpRfqRepository, MongoPumpRfqRepository),
    repositoryProvider(
      TankChuteRfqRepository,
      PostgresTankChuteRfqRepository,
      MongoTankChuteRfqRepository,
    ),
    repositoryProvider(
      FastenerRfqRepository,
      PostgresFastenerRfqRepository,
      MongoFastenerRfqRepository,
    ),
    repositoryProvider(
      RfqDocumentRepository,
      PostgresRfqDocumentRepository,
      MongoRfqDocumentRepository,
    ),
    repositoryProvider(RfqDraftRepository, PostgresRfqDraftRepository, MongoRfqDraftRepository),
    repositoryProvider(
      RfqClarificationRequestRepository,
      PostgresRfqClarificationRequestRepository,
      MongoRfqClarificationRequestRepository,
    ),
    repositoryProvider(
      AnonymousDraftRepository,
      PostgresAnonymousDraftRepository,
      MongoAnonymousDraftRepository,
    ),
    repositoryProvider(
      RfqSequenceRepository,
      PostgresRfqSequenceRepository,
      MongoRfqSequenceRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      SteelSpecificationRepository,
      PostgresSteelSpecificationRepository,
      MongoSteelSpecificationRepository,
    ),
    repositoryProvider(
      PipeDimensionRepository,
      PostgresPipeDimensionRepository,
      MongoPipeDimensionRepository,
    ),
    repositoryProvider(
      NbNpsLookupRepository,
      PostgresNbNpsLookupRepository,
      MongoNbNpsLookupRepository,
    ),
    repositoryProvider(
      FlangeDimensionRepository,
      PostgresFlangeDimensionRepository,
      MongoFlangeDimensionRepository,
    ),
    repositoryProvider(BoltMassRepository, PostgresBoltMassRepository, MongoBoltMassRepository),
    repositoryProvider(NutMassRepository, PostgresNutMassRepository, MongoNutMassRepository),
    repositoryProvider(BoqRepository, PostgresBoqRepository, MongoBoqRepository),
    repositoryProvider(
      BoqSupplierAccessRepository,
      PostgresBoqSupplierAccessRepository,
      MongoBoqSupplierAccessRepository,
    ),
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
  ],
  exports: [
    RfqService,
    RfqDraftService,
    RfqDocumentService,
    AnonymousDraftService,
    ReferenceDataCacheService,
  ],
})
export class RfqModule {}
