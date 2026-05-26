import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { HdpeButtweldPrice } from "./entities/hdpe-buttweld-price.entity";
import { HdpeFittingDimension } from "./entities/hdpe-fitting-dimension.entity";
import { HdpeFittingType } from "./entities/hdpe-fitting-type.entity";
import { HdpeFittingWeight } from "./entities/hdpe-fitting-weight.entity";
import { HdpePipeSpecification } from "./entities/hdpe-pipe-specification.entity";
import { HdpeStandard } from "./entities/hdpe-standard.entity";
import { HdpeStubPrice } from "./entities/hdpe-stub-price.entity";
import { HdpeController } from "./hdpe.controller";
import { HdpeService } from "./hdpe.service";
import { HdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository";
import { MongoHdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository.mongo";
import { PostgresHdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository.postgres";
import { HdpeFittingDimensionController } from "./hdpe-fitting-dimension.controller";
import { HdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository";
import { MongoHdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository.mongo";
import { PostgresHdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository.postgres";
import { HdpeFittingDimensionService } from "./hdpe-fitting-dimension.service";
import { HdpeFittingTypeRepository } from "./hdpe-fitting-type.repository";
import { MongoHdpeFittingTypeRepository } from "./hdpe-fitting-type.repository.mongo";
import { PostgresHdpeFittingTypeRepository } from "./hdpe-fitting-type.repository.postgres";
import { HdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository";
import { MongoHdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository.mongo";
import { PostgresHdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository.postgres";
import { HdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository";
import { MongoHdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository.mongo";
import { PostgresHdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository.postgres";
import { HdpeStandardRepository } from "./hdpe-standard.repository";
import { MongoHdpeStandardRepository } from "./hdpe-standard.repository.mongo";
import { PostgresHdpeStandardRepository } from "./hdpe-standard.repository.postgres";
import { HdpeStubPriceRepository } from "./hdpe-stub-price.repository";
import { MongoHdpeStubPriceRepository } from "./hdpe-stub-price.repository.mongo";
import { PostgresHdpeStubPriceRepository } from "./hdpe-stub-price.repository.postgres";
import { HdpeButtweldPriceSchema } from "./schemas/hdpe-buttweld-price.schema";
import { HdpeFittingDimensionSchema } from "./schemas/hdpe-fitting-dimension.schema";
import { HdpeFittingTypeSchema } from "./schemas/hdpe-fitting-type.schema";
import { HdpeFittingWeightSchema } from "./schemas/hdpe-fitting-weight.schema";
import { HdpePipeSpecificationSchema } from "./schemas/hdpe-pipe-specification.schema";
import { HdpeStandardSchema } from "./schemas/hdpe-standard.schema";
import { HdpeStubPriceSchema } from "./schemas/hdpe-stub-price.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "HdpePipeSpecification", schema: HdpePipeSpecificationSchema },
            { name: "HdpeFittingType", schema: HdpeFittingTypeSchema },
            { name: "HdpeFittingWeight", schema: HdpeFittingWeightSchema },
            { name: "HdpeFittingDimension", schema: HdpeFittingDimensionSchema },
            { name: "HdpeButtweldPrice", schema: HdpeButtweldPriceSchema },
            { name: "HdpeStubPrice", schema: HdpeStubPriceSchema },
            { name: "HdpeStandard", schema: HdpeStandardSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            HdpePipeSpecification,
            HdpeFittingType,
            HdpeFittingWeight,
            HdpeFittingDimension,
            HdpeButtweldPrice,
            HdpeStubPrice,
            HdpeStandard,
          ]),
        ]),
  ],
  controllers: [HdpeController, HdpeFittingDimensionController],
  providers: [
    HdpeService,
    HdpeFittingDimensionService,
    repositoryProvider(
      HdpePipeSpecificationRepository,
      PostgresHdpePipeSpecificationRepository,
      MongoHdpePipeSpecificationRepository,
    ),
    repositoryProvider(
      HdpeFittingTypeRepository,
      PostgresHdpeFittingTypeRepository,
      MongoHdpeFittingTypeRepository,
    ),
    repositoryProvider(
      HdpeFittingWeightRepository,
      PostgresHdpeFittingWeightRepository,
      MongoHdpeFittingWeightRepository,
    ),
    repositoryProvider(
      HdpeFittingDimensionRepository,
      PostgresHdpeFittingDimensionRepository,
      MongoHdpeFittingDimensionRepository,
    ),
    repositoryProvider(
      HdpeButtweldPriceRepository,
      PostgresHdpeButtweldPriceRepository,
      MongoHdpeButtweldPriceRepository,
    ),
    repositoryProvider(
      HdpeStubPriceRepository,
      PostgresHdpeStubPriceRepository,
      MongoHdpeStubPriceRepository,
    ),
    repositoryProvider(
      HdpeStandardRepository,
      PostgresHdpeStandardRepository,
      MongoHdpeStandardRepository,
    ),
  ],
  exports: [HdpeService, HdpeFittingDimensionService],
})
export class HdpeModule {}
