import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FittingRepository } from "src/fitting/fitting.repository";
import { MongoFittingRepository } from "src/fitting/fitting.repository.mongo";
import { FittingSchema } from "src/fitting/schemas/fitting.schema";
import { FittingBoreRepository } from "src/fitting-bore/fitting-bore.repository";
import { MongoFittingBoreRepository } from "src/fitting-bore/fitting-bore.repository.mongo";
import { FittingBoreSchema } from "src/fitting-bore/schemas/fitting-bore.schema";
import { FittingDimensionRepository } from "src/fitting-dimension/fitting-dimension.repository";
import { MongoFittingDimensionRepository } from "src/fitting-dimension/fitting-dimension.repository.mongo";
import { FittingDimensionSchema } from "src/fitting-dimension/schemas/fitting-dimension.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FittingVariantController } from "./fitting-variant.controller";
import { FittingVariantRepository } from "./fitting-variant.repository";
import { MongoFittingVariantRepository } from "./fitting-variant.repository.mongo";
import { FittingVariantService } from "./fitting-variant.service";
import { FittingVariantSchema } from "./schemas/fitting-variant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FittingVariant", schema: FittingVariantSchema },
      { name: "Fitting", schema: FittingSchema },
      { name: "FittingBore", schema: FittingBoreSchema },
      { name: "FittingDimension", schema: FittingDimensionSchema },
    ]),
  ],
  controllers: [FittingVariantController],
  providers: [
    FittingVariantService,
    repositoryProvider(FittingVariantRepository, MongoFittingVariantRepository),
    repositoryProvider(FittingRepository, MongoFittingRepository),
    repositoryProvider(FittingBoreRepository, MongoFittingBoreRepository),
    repositoryProvider(FittingDimensionRepository, MongoFittingDimensionRepository),
  ],
})
export class FittingVariantModule {}
