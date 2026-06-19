import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PvcController } from "./pvc.controller";
import { PvcService } from "./pvc.service";
import { PvcCementPriceRepository } from "./pvc-cement-price.repository";
import { MongoPvcCementPriceRepository } from "./pvc-cement-price.repository.mongo";
import { PvcFittingDimensionController } from "./pvc-fitting-dimension.controller";
import { PvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository";
import { MongoPvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository.mongo";
import { PvcFittingDimensionService } from "./pvc-fitting-dimension.service";
import { PvcFittingTypeRepository } from "./pvc-fitting-type.repository";
import { MongoPvcFittingTypeRepository } from "./pvc-fitting-type.repository.mongo";
import { PvcFittingWeightRepository } from "./pvc-fitting-weight.repository";
import { MongoPvcFittingWeightRepository } from "./pvc-fitting-weight.repository.mongo";
import { PvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository";
import { MongoPvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository.mongo";
import { PvcStandardRepository } from "./pvc-standard.repository";
import { MongoPvcStandardRepository } from "./pvc-standard.repository.mongo";
import { PvcCementPriceSchema } from "./schemas/pvc-cement-price.schema";
import { PvcFittingDimensionSchema } from "./schemas/pvc-fitting-dimension.schema";
import { PvcFittingTypeSchema } from "./schemas/pvc-fitting-type.schema";
import { PvcFittingWeightSchema } from "./schemas/pvc-fitting-weight.schema";
import { PvcPipeSpecificationSchema } from "./schemas/pvc-pipe-specification.schema";
import { PvcStandardSchema } from "./schemas/pvc-standard.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PvcPipeSpecification", schema: PvcPipeSpecificationSchema },
      { name: "PvcFittingType", schema: PvcFittingTypeSchema },
      { name: "PvcFittingWeight", schema: PvcFittingWeightSchema },
      { name: "PvcFittingDimension", schema: PvcFittingDimensionSchema },
      { name: "PvcCementPrice", schema: PvcCementPriceSchema },
      { name: "PvcStandard", schema: PvcStandardSchema },
    ]),
  ],
  controllers: [PvcController, PvcFittingDimensionController],
  providers: [
    PvcService,
    PvcFittingDimensionService,
    repositoryProvider(PvcPipeSpecificationRepository, MongoPvcPipeSpecificationRepository),
    repositoryProvider(PvcFittingTypeRepository, MongoPvcFittingTypeRepository),
    repositoryProvider(PvcFittingWeightRepository, MongoPvcFittingWeightRepository),
    repositoryProvider(PvcCementPriceRepository, MongoPvcCementPriceRepository),
    repositoryProvider(PvcStandardRepository, MongoPvcStandardRepository),
    repositoryProvider(PvcFittingDimensionRepository, MongoPvcFittingDimensionRepository),
  ],
  exports: [PvcService, PvcFittingDimensionService],
})
export class PvcModule {}
