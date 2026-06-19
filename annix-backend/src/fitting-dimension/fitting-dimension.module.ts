import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AngleRangeSchema } from "src/angle-range/schemas/angle-range.schema";
import { FittingVariantSchema } from "src/fitting-variant/schemas/fitting-variant.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FittingDimensionController } from "./fitting-dimension.controller";
import { FittingDimensionRepository } from "./fitting-dimension.repository";
import { MongoFittingDimensionRepository } from "./fitting-dimension.repository.mongo";
import { FittingDimensionService } from "./fitting-dimension.service";
import { FittingDimensionSchema } from "./schemas/fitting-dimension.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FittingDimension", schema: FittingDimensionSchema },
      { name: "FittingVariant", schema: FittingVariantSchema },
      { name: "AngleRange", schema: AngleRangeSchema },
    ]),
  ],
  controllers: [FittingDimensionController],
  providers: [
    FittingDimensionService,
    repositoryProvider(FittingDimensionRepository, MongoFittingDimensionRepository),
  ],
  exports: [FittingDimensionService],
})
export class FittingDimensionModule {}
