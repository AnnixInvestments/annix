import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PvcCementPrice } from "./entities/pvc-cement-price.entity";
import { PvcFittingDimension } from "./entities/pvc-fitting-dimension.entity";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";
import { PvcStandard } from "./entities/pvc-standard.entity";
import { PvcController } from "./pvc.controller";
import { PvcService } from "./pvc.service";
import { PvcCementPriceRepository } from "./pvc-cement-price.repository";
import { MongoPvcCementPriceRepository } from "./pvc-cement-price.repository.mongo";
import { PostgresPvcCementPriceRepository } from "./pvc-cement-price.repository.postgres";
import { PvcFittingDimensionController } from "./pvc-fitting-dimension.controller";
import { PvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository";
import { MongoPvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository.mongo";
import { PostgresPvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository.postgres";
import { PvcFittingDimensionService } from "./pvc-fitting-dimension.service";
import { PvcFittingTypeRepository } from "./pvc-fitting-type.repository";
import { MongoPvcFittingTypeRepository } from "./pvc-fitting-type.repository.mongo";
import { PostgresPvcFittingTypeRepository } from "./pvc-fitting-type.repository.postgres";
import { PvcFittingWeightRepository } from "./pvc-fitting-weight.repository";
import { MongoPvcFittingWeightRepository } from "./pvc-fitting-weight.repository.mongo";
import { PostgresPvcFittingWeightRepository } from "./pvc-fitting-weight.repository.postgres";
import { PvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository";
import { MongoPvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository.mongo";
import { PostgresPvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository.postgres";
import { PvcStandardRepository } from "./pvc-standard.repository";
import { MongoPvcStandardRepository } from "./pvc-standard.repository.mongo";
import { PostgresPvcStandardRepository } from "./pvc-standard.repository.postgres";
import { PvcCementPriceSchema } from "./schemas/pvc-cement-price.schema";
import { PvcFittingDimensionSchema } from "./schemas/pvc-fitting-dimension.schema";
import { PvcFittingTypeSchema } from "./schemas/pvc-fitting-type.schema";
import { PvcFittingWeightSchema } from "./schemas/pvc-fitting-weight.schema";
import { PvcPipeSpecificationSchema } from "./schemas/pvc-pipe-specification.schema";
import { PvcStandardSchema } from "./schemas/pvc-standard.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PvcPipeSpecification", schema: PvcPipeSpecificationSchema },
            { name: "PvcFittingType", schema: PvcFittingTypeSchema },
            { name: "PvcFittingWeight", schema: PvcFittingWeightSchema },
            { name: "PvcFittingDimension", schema: PvcFittingDimensionSchema },
            { name: "PvcCementPrice", schema: PvcCementPriceSchema },
            { name: "PvcStandard", schema: PvcStandardSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            PvcPipeSpecification,
            PvcFittingType,
            PvcFittingWeight,
            PvcFittingDimension,
            PvcCementPrice,
            PvcStandard,
          ]),
        ]),
  ],
  controllers: [PvcController, PvcFittingDimensionController],
  providers: [
    PvcService,
    PvcFittingDimensionService,
    repositoryProvider(
      PvcPipeSpecificationRepository,
      PostgresPvcPipeSpecificationRepository,
      MongoPvcPipeSpecificationRepository,
    ),
    repositoryProvider(
      PvcFittingTypeRepository,
      PostgresPvcFittingTypeRepository,
      MongoPvcFittingTypeRepository,
    ),
    repositoryProvider(
      PvcFittingWeightRepository,
      PostgresPvcFittingWeightRepository,
      MongoPvcFittingWeightRepository,
    ),
    repositoryProvider(
      PvcCementPriceRepository,
      PostgresPvcCementPriceRepository,
      MongoPvcCementPriceRepository,
    ),
    repositoryProvider(
      PvcStandardRepository,
      PostgresPvcStandardRepository,
      MongoPvcStandardRepository,
    ),
    repositoryProvider(
      PvcFittingDimensionRepository,
      PostgresPvcFittingDimensionRepository,
      MongoPvcFittingDimensionRepository,
    ),
  ],
  exports: [PvcService, PvcFittingDimensionService],
})
export class PvcModule {}
