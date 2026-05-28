import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../email/email.module";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangePressureClassRepository } from "../flange-pressure-class/flange-pressure-class.repository";
import { MongoFlangePressureClassRepository } from "../flange-pressure-class/flange-pressure-class.repository.mongo";
import { PostgresFlangePressureClassRepository } from "../flange-pressure-class/flange-pressure-class.repository.postgres";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { MongoFlangeStandardRepository } from "../flange-standard/flange-standard.repository.mongo";
import { PostgresFlangeStandardRepository } from "../flange-standard/flange-standard.repository.postgres";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { PostgresRfqRepository } from "../rfq/rfq.repository.postgres";
import { RfqItemRepository } from "../rfq/rfq-item.repository";
import { MongoRfqItemRepository } from "../rfq/rfq-item.repository.mongo";
import { PostgresRfqItemRepository } from "../rfq/rfq-item.repository.postgres";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { RfqItemSchema } from "../rfq/schemas/rfq-item.schema";
import { SupplierCapability } from "../supplier/entities/supplier-capability.entity";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierCapabilitySchema } from "../supplier/schemas/supplier-capability.schema";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierModule } from "../supplier/supplier.module";
import { SupplierCapabilityRepository } from "../supplier/supplier-capability.repository";
import { MongoSupplierCapabilityRepository } from "../supplier/supplier-capability.repository.mongo";
import { PostgresSupplierCapabilityRepository } from "../supplier/supplier-capability.repository.postgres";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.mongo";
import { PostgresSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.postgres";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { BoqController } from "./boq.controller";
import { BoqRepository } from "./boq.repository";
import { MongoBoqRepository } from "./boq.repository.mongo";
import { PostgresBoqRepository } from "./boq.repository.postgres";
import { BoqService } from "./boq.service";
import { BoqDistributionService } from "./boq-distribution.service";
import { BoqLineItemRepository } from "./boq-line-item.repository";
import { MongoBoqLineItemRepository } from "./boq-line-item.repository.mongo";
import { PostgresBoqLineItemRepository } from "./boq-line-item.repository.postgres";
import { BoqParserService } from "./boq-parser.service";
import { BoqSectionRepository } from "./boq-section.repository";
import { MongoBoqSectionRepository } from "./boq-section.repository.mongo";
import { PostgresBoqSectionRepository } from "./boq-section.repository.postgres";
import { BoqSupplierAccessRepository } from "./boq-supplier-access.repository";
import { MongoBoqSupplierAccessRepository } from "./boq-supplier-access.repository.mongo";
import { PostgresBoqSupplierAccessRepository } from "./boq-supplier-access.repository.postgres";
import { Boq } from "./entities/boq.entity";
import { BoqLineItem } from "./entities/boq-line-item.entity";
import { BoqSection } from "./entities/boq-section.entity";
import { BoqSupplierAccess } from "./entities/boq-supplier-access.entity";
import { BoqSchema } from "./schemas/boq.schema";
import { BoqLineItemSchema } from "./schemas/boq-line-item.schema";
import { BoqSectionSchema } from "./schemas/boq-section.schema";
import { BoqSupplierAccessSchema } from "./schemas/boq-supplier-access.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            SupplierCapability,
            SupplierOnboarding,
            SupplierProfile,
            Boq,
            BoqLineItem,
            BoqSection,
            BoqSupplierAccess,
            Rfq,
            RfqItem,
            FlangeStandard,
            FlangePressureClass,
          ]),
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
    repositoryProvider(BoqRepository, PostgresBoqRepository, MongoBoqRepository),
    repositoryProvider(
      BoqLineItemRepository,
      PostgresBoqLineItemRepository,
      MongoBoqLineItemRepository,
    ),
    repositoryProvider(
      BoqSectionRepository,
      PostgresBoqSectionRepository,
      MongoBoqSectionRepository,
    ),
    repositoryProvider(
      BoqSupplierAccessRepository,
      PostgresBoqSupplierAccessRepository,
      MongoBoqSupplierAccessRepository,
    ),
    repositoryProvider(RfqRepository, PostgresRfqRepository, MongoRfqRepository),
    repositoryProvider(RfqItemRepository, PostgresRfqItemRepository, MongoRfqItemRepository),
    repositoryProvider(
      FlangeStandardRepository,
      PostgresFlangeStandardRepository,
      MongoFlangeStandardRepository,
    ),
    repositoryProvider(
      FlangePressureClassRepository,
      PostgresFlangePressureClassRepository,
      MongoFlangePressureClassRepository,
    ),
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
    repositoryProvider(
      SupplierCapabilityRepository,
      PostgresSupplierCapabilityRepository,
      MongoSupplierCapabilityRepository,
    ),
    repositoryProvider(
      SupplierOnboardingRepository,
      PostgresSupplierOnboardingRepository,
      MongoSupplierOnboardingRepository,
    ),
  ],
  exports: [BoqService, BoqDistributionService],
})
export class BoqModule {}
