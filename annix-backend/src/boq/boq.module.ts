import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { EmailModule } from "../email/email.module";
import { FlangePressureClassRepository } from "../flange-pressure-class/flange-pressure-class.repository";
import { MongoFlangePressureClassRepository } from "../flange-pressure-class/flange-pressure-class.repository.mongo";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { MongoFlangeStandardRepository } from "../flange-standard/flange-standard.repository.mongo";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { RfqItemRepository } from "../rfq/rfq-item.repository";
import { MongoRfqItemRepository } from "../rfq/rfq-item.repository.mongo";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { RfqItemSchema } from "../rfq/schemas/rfq-item.schema";
import { SupplierCapabilitySchema } from "../supplier/schemas/supplier-capability.schema";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierModule } from "../supplier/supplier.module";
import { SupplierCapabilityRepository } from "../supplier/supplier-capability.repository";
import { MongoSupplierCapabilityRepository } from "../supplier/supplier-capability.repository.mongo";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.mongo";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { BoqController } from "./boq.controller";
import { BoqRepository } from "./boq.repository";
import { MongoBoqRepository } from "./boq.repository.mongo";
import { BoqService } from "./boq.service";
import { BoqDistributionService } from "./boq-distribution.service";
import { BoqLineItemRepository } from "./boq-line-item.repository";
import { MongoBoqLineItemRepository } from "./boq-line-item.repository.mongo";
import { BoqParserService } from "./boq-parser.service";
import { BoqSectionRepository } from "./boq-section.repository";
import { MongoBoqSectionRepository } from "./boq-section.repository.mongo";
import { BoqSupplierAccessRepository } from "./boq-supplier-access.repository";
import { MongoBoqSupplierAccessRepository } from "./boq-supplier-access.repository.mongo";
import { BoqSchema } from "./schemas/boq.schema";
import { BoqLineItemSchema } from "./schemas/boq-line-item.schema";
import { BoqSectionSchema } from "./schemas/boq-section.schema";
import { BoqSupplierAccessSchema } from "./schemas/boq-supplier-access.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Boq", schema: BoqSchema },
      { name: "BoqLineItem", schema: BoqLineItemSchema },
      { name: "BoqSection", schema: BoqSectionSchema },
      { name: "BoqSupplierAccess", schema: BoqSupplierAccessSchema },
      { name: "Rfq", schema: RfqSchema },
      { name: "RfqItem", schema: RfqItemSchema },
      { name: "FlangeStandard", schema: FlangeStandardSchema },
      { name: "FlangePressureClass", schema: FlangePressureClassSchema },
      { name: "SupplierProfile", schema: SupplierProfileSchema },
      { name: "SupplierCapability", schema: SupplierCapabilitySchema },
      { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    forwardRef(() => SupplierModule),
    EmailModule,
  ],
  controllers: [BoqController],
  providers: [
    BoqService,
    BoqParserService,
    BoqDistributionService,
    repositoryProvider(BoqRepository, MongoBoqRepository),
    repositoryProvider(BoqLineItemRepository, MongoBoqLineItemRepository),
    repositoryProvider(BoqSectionRepository, MongoBoqSectionRepository),
    repositoryProvider(BoqSupplierAccessRepository, MongoBoqSupplierAccessRepository),
    repositoryProvider(RfqRepository, MongoRfqRepository),
    repositoryProvider(RfqItemRepository, MongoRfqItemRepository),
    repositoryProvider(FlangeStandardRepository, MongoFlangeStandardRepository),
    repositoryProvider(FlangePressureClassRepository, MongoFlangePressureClassRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
    repositoryProvider(SupplierCapabilityRepository, MongoSupplierCapabilityRepository),
    repositoryProvider(SupplierOnboardingRepository, MongoSupplierOnboardingRepository),
  ],
  exports: [BoqService, BoqDistributionService],
})
export class BoqModule {}
