import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { AuditModule } from "../audit/audit.module";
import { BoltSchema } from "../bolt/schemas/bolt.schema";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { MongoBoltMassRepository } from "../bolt-mass/bolt-mass.repository.mongo";
import { BoltMassSchema } from "../bolt-mass/schemas/bolt-mass.schema";
import { BoqRepository } from "../boq/boq.repository";
import { MongoBoqRepository } from "../boq/boq.repository.mongo";
import { BoqSectionRepository } from "../boq/boq-section.repository";
import { MongoBoqSectionRepository } from "../boq/boq-section.repository.mongo";
import { BoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository";
import { MongoBoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository.mongo";
import { BoqSchema } from "../boq/schemas/boq.schema";
import { BoqLineItemSchema } from "../boq/schemas/boq-line-item.schema";
import { BoqSectionSchema } from "../boq/schemas/boq-section.schema";
import { BoqSupplierAccessSchema } from "../boq/schemas/boq-supplier-access.schema";
import { CustomerModule } from "../customer/customer.module";
import { CustomerBlockedSupplierRepository } from "../customer/customer-blocked-supplier.repository";
import { MongoCustomerBlockedSupplierRepository } from "../customer/customer-blocked-supplier.repository.mongo";
import { CustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository";
import { MongoCustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository.mongo";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { CustomerBlockedSupplierSchema } from "../customer/schemas/customer-blocked-supplier.schema";
import { CustomerPreferredSupplierSchema } from "../customer/schemas/customer-preferred-supplier.schema";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { EmailModule } from "../email/email.module";
import { FittingModule } from "../fitting/fitting.module";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { MongoFlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository.mongo";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.mongo";
import { NbNpsLookupSchema } from "../nb-nps-lookup/schemas/nb-nps-lookup.schema";
import { NixModule } from "../nix/nix.module";
import { NixExtractionRepository } from "../nix/nix-extraction.repository";
import { MongoNixExtractionRepository } from "../nix/nix-extraction.repository.mongo";
import { NixExtractionSessionRepository } from "../nix/nix-extraction-session.repository";
import { MongoNixExtractionSessionRepository } from "../nix/nix-extraction-session.repository.mongo";
import { NixExtractionSchema } from "../nix/schemas/nix-extraction.schema";
import { NixExtractionSessionSchema } from "../nix/schemas/nix-extraction-session.schema";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { MongoNutMassRepository } from "../nut-mass/nut-mass.repository.mongo";
import { NutMassSchema } from "../nut-mass/schemas/nut-mass.schema";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.mongo";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { PipePressureSchema } from "../pipe-pressure/schemas/pipe-pressure.schema";
import { SteelSpecificationSchema } from "../steel-specification/schemas/steel-specification.schema";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { MongoSteelSpecificationRepository } from "../steel-specification/steel-specification.repository.mongo";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.mongo";
import { StockControlCompanySchema } from "../stock-control/schemas/stock-control-company.schema";
import { CompanyEmailService } from "../stock-control/services/company-email.service";
import { SupplierCapabilitySchema } from "../supplier/schemas/supplier-capability.schema";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierCapabilityRepository } from "../supplier/supplier-capability.repository";
import { MongoSupplierCapabilityRepository } from "../supplier/supplier-capability.repository.mongo";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { AnonymousDraftController } from "./anonymous-draft.controller";
import { AnonymousDraftRepository } from "./anonymous-draft.repository";
import { MongoAnonymousDraftRepository } from "./anonymous-draft.repository.mongo";
import { AnonymousDraftService } from "./anonymous-draft.service";
import { BendRfqRepository } from "./bend-rfq.repository";
import { MongoBendRfqRepository } from "./bend-rfq.repository.mongo";
import { ExpansionJointRfqRepository } from "./expansion-joint-rfq.repository";
import { MongoExpansionJointRfqRepository } from "./expansion-joint-rfq.repository.mongo";
import { FastenerRfqRepository } from "./fastener-rfq.repository";
import { MongoFastenerRfqRepository } from "./fastener-rfq.repository.mongo";
import { FittingRfqRepository } from "./fitting-rfq.repository";
import { MongoFittingRfqRepository } from "./fitting-rfq.repository.mongo";
import { InstrumentRfqRepository } from "./instrument-rfq.repository";
import { MongoInstrumentRfqRepository } from "./instrument-rfq.repository.mongo";
import { PumpRfqRepository } from "./pump-rfq.repository";
import { MongoPumpRfqRepository } from "./pump-rfq.repository.mongo";
import { RfqController } from "./rfq.controller";
import { RfqRepository } from "./rfq.repository";
import { MongoRfqRepository } from "./rfq.repository.mongo";
import { RfqService } from "./rfq.service";
import { RfqClarificationRequestRepository } from "./rfq-clarification-request.repository";
import { MongoRfqClarificationRequestRepository } from "./rfq-clarification-request.repository.mongo";
import { RfqDocumentRepository } from "./rfq-document.repository";
import { MongoRfqDocumentRepository } from "./rfq-document.repository.mongo";
import { RfqDraftRepository } from "./rfq-draft.repository";
import { MongoRfqDraftRepository } from "./rfq-draft.repository.mongo";
import { RfqDraftService } from "./rfq-draft.service";
import { RfqItemRepository } from "./rfq-item.repository";
import { MongoRfqItemRepository } from "./rfq-item.repository.mongo";
import { RfqSequenceRepository } from "./rfq-sequence.repository";
import { MongoRfqSequenceRepository } from "./rfq-sequence.repository.mongo";
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
import { RfqSourcingController } from "./sourcing/rfq-sourcing.controller";
import { RfqSourcingDistributionService } from "./sourcing/rfq-sourcing-distribution.service";
import { RfqSourcingSendAuditRepository } from "./sourcing/rfq-sourcing-send-audit.repository";
import { MongoRfqSourcingSendAuditRepository } from "./sourcing/rfq-sourcing-send-audit.repository.mongo";
import { RfqSourcingSendAuditSchema } from "./sourcing/schemas/rfq-sourcing-send-audit.schema";
import { SourcingBoqBridgeService } from "./sourcing/sourcing-boq-bridge.service";
import { StraightPipeRfqRepository } from "./straight-pipe-rfq.repository";
import { MongoStraightPipeRfqRepository } from "./straight-pipe-rfq.repository.mongo";
import { TankChuteRfqRepository } from "./tank-chute-rfq.repository";
import { MongoTankChuteRfqRepository } from "./tank-chute-rfq.repository.mongo";
import { ValveRfqRepository } from "./valve-rfq.repository";
import { MongoValveRfqRepository } from "./valve-rfq.repository.mongo";

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    forwardRef(() => NixModule),
    AuditModule,
    EmailModule,
    FittingModule,
    FlangeTypeWeightModule,
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
      { name: "BoqSection", schema: BoqSectionSchema },
      { name: "BoqSupplierAccess", schema: BoqSupplierAccessSchema },
      { name: "SupplierProfile", schema: SupplierProfileSchema },
      { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
      { name: "PipePressure", schema: PipePressureSchema },
      { name: "FlangeStandard", schema: FlangeStandardSchema },
      { name: "FlangePressureClass", schema: FlangePressureClassSchema },
      { name: "Bolt", schema: BoltSchema },
      { name: "NixExtractionSession", schema: NixExtractionSessionSchema },
      { name: "NixExtraction", schema: NixExtractionSchema },
      { name: "CustomerPreferredSupplier", schema: CustomerPreferredSupplierSchema },
      { name: "CustomerBlockedSupplier", schema: CustomerBlockedSupplierSchema },
      { name: "CustomerProfile", schema: CustomerProfileSchema },
      { name: "SupplierCapability", schema: SupplierCapabilitySchema },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      { name: "RfqSourcingSendAudit", schema: RfqSourcingSendAuditSchema },
    ]),
    MulterModule.register({
      limits: {
        // 50 MB
        fileSize: 50 * 1024 * 1024,
      },
    }),
  ],
  controllers: [RfqController, AnonymousDraftController, RfqSourcingController],
  providers: [
    RfqService,
    RfqDraftService,
    RfqDocumentService,
    RfqCalculationService,
    AnonymousDraftService,
    ReferenceDataCacheService,
    RfqSourcingDistributionService,
    SourcingBoqBridgeService,
    CompanyEmailService,
    repositoryProvider(RfqRepository, MongoRfqRepository),
    repositoryProvider(RfqItemRepository, MongoRfqItemRepository),
    repositoryProvider(StraightPipeRfqRepository, MongoStraightPipeRfqRepository),
    repositoryProvider(BendRfqRepository, MongoBendRfqRepository),
    repositoryProvider(FittingRfqRepository, MongoFittingRfqRepository),
    repositoryProvider(ExpansionJointRfqRepository, MongoExpansionJointRfqRepository),
    repositoryProvider(ValveRfqRepository, MongoValveRfqRepository),
    repositoryProvider(InstrumentRfqRepository, MongoInstrumentRfqRepository),
    repositoryProvider(PumpRfqRepository, MongoPumpRfqRepository),
    repositoryProvider(TankChuteRfqRepository, MongoTankChuteRfqRepository),
    repositoryProvider(FastenerRfqRepository, MongoFastenerRfqRepository),
    repositoryProvider(RfqDocumentRepository, MongoRfqDocumentRepository),
    repositoryProvider(RfqDraftRepository, MongoRfqDraftRepository),
    repositoryProvider(RfqClarificationRequestRepository, MongoRfqClarificationRequestRepository),
    repositoryProvider(AnonymousDraftRepository, MongoAnonymousDraftRepository),
    repositoryProvider(RfqSequenceRepository, MongoRfqSequenceRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(SteelSpecificationRepository, MongoSteelSpecificationRepository),
    repositoryProvider(PipeDimensionRepository, MongoPipeDimensionRepository),
    repositoryProvider(NbNpsLookupRepository, MongoNbNpsLookupRepository),
    repositoryProvider(FlangeDimensionRepository, MongoFlangeDimensionRepository),
    repositoryProvider(BoltMassRepository, MongoBoltMassRepository),
    repositoryProvider(NutMassRepository, MongoNutMassRepository),
    repositoryProvider(BoqRepository, MongoBoqRepository),
    repositoryProvider(BoqSectionRepository, MongoBoqSectionRepository),
    repositoryProvider(BoqSupplierAccessRepository, MongoBoqSupplierAccessRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
    repositoryProvider(SupplierCapabilityRepository, MongoSupplierCapabilityRepository),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(NixExtractionSessionRepository, MongoNixExtractionSessionRepository),
    repositoryProvider(NixExtractionRepository, MongoNixExtractionRepository),
    repositoryProvider(
      CustomerPreferredSupplierRepository,
      MongoCustomerPreferredSupplierRepository,
    ),
    repositoryProvider(CustomerBlockedSupplierRepository, MongoCustomerBlockedSupplierRepository),
    repositoryProvider(CustomerProfileRepository, MongoCustomerProfileRepository),
    repositoryProvider(RfqSourcingSendAuditRepository, MongoRfqSourcingSendAuditRepository),
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
