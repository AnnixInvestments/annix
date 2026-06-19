import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { HdpeController } from "./hdpe.controller";
import { HdpeService } from "./hdpe.service";
import { HdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository";
import { MongoHdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository.mongo";
import { HdpeFittingDimensionController } from "./hdpe-fitting-dimension.controller";
import { HdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository";
import { MongoHdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository.mongo";
import { HdpeFittingDimensionService } from "./hdpe-fitting-dimension.service";
import { HdpeFittingTypeRepository } from "./hdpe-fitting-type.repository";
import { MongoHdpeFittingTypeRepository } from "./hdpe-fitting-type.repository.mongo";
import { HdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository";
import { MongoHdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository.mongo";
import { HdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository";
import { MongoHdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository.mongo";
import { HdpeStandardRepository } from "./hdpe-standard.repository";
import { MongoHdpeStandardRepository } from "./hdpe-standard.repository.mongo";
import { HdpeStubPriceRepository } from "./hdpe-stub-price.repository";
import { MongoHdpeStubPriceRepository } from "./hdpe-stub-price.repository.mongo";
import { HdpeButtweldPriceSchema } from "./schemas/hdpe-buttweld-price.schema";
import { HdpeFittingDimensionSchema } from "./schemas/hdpe-fitting-dimension.schema";
import { HdpeFittingTypeSchema } from "./schemas/hdpe-fitting-type.schema";
import { HdpeFittingWeightSchema } from "./schemas/hdpe-fitting-weight.schema";
import { HdpePipeSpecificationSchema } from "./schemas/hdpe-pipe-specification.schema";
import { HdpeStandardSchema } from "./schemas/hdpe-standard.schema";
import { HdpeStubPriceSchema } from "./schemas/hdpe-stub-price.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "HdpePipeSpecification", schema: HdpePipeSpecificationSchema },
      { name: "HdpeFittingType", schema: HdpeFittingTypeSchema },
      { name: "HdpeFittingWeight", schema: HdpeFittingWeightSchema },
      { name: "HdpeFittingDimension", schema: HdpeFittingDimensionSchema },
      { name: "HdpeButtweldPrice", schema: HdpeButtweldPriceSchema },
      { name: "HdpeStubPrice", schema: HdpeStubPriceSchema },
      { name: "HdpeStandard", schema: HdpeStandardSchema },
    ]),
  ],
  controllers: [HdpeController, HdpeFittingDimensionController],
  providers: [
    HdpeService,
    HdpeFittingDimensionService,
    repositoryProvider(HdpePipeSpecificationRepository, MongoHdpePipeSpecificationRepository),
    repositoryProvider(HdpeFittingTypeRepository, MongoHdpeFittingTypeRepository),
    repositoryProvider(HdpeFittingWeightRepository, MongoHdpeFittingWeightRepository),
    repositoryProvider(HdpeFittingDimensionRepository, MongoHdpeFittingDimensionRepository),
    repositoryProvider(HdpeButtweldPriceRepository, MongoHdpeButtweldPriceRepository),
    repositoryProvider(HdpeStubPriceRepository, MongoHdpeStubPriceRepository),
    repositoryProvider(HdpeStandardRepository, MongoHdpeStandardRepository),
  ],
  exports: [HdpeService, HdpeFittingDimensionService],
})
export class HdpeModule {}
