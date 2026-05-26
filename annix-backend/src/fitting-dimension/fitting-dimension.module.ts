import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { AngleRangeSchema } from "src/angle-range/schemas/angle-range.schema";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { FittingVariantSchema } from "src/fitting-variant/schemas/fitting-variant.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionController } from "./fitting-dimension.controller";
import { FittingDimensionRepository } from "./fitting-dimension.repository";
import { MongoFittingDimensionRepository } from "./fitting-dimension.repository.mongo";
import { PostgresFittingDimensionRepository } from "./fitting-dimension.repository.postgres";
import { FittingDimensionService } from "./fitting-dimension.service";
import { FittingDimensionSchema } from "./schemas/fitting-dimension.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FittingDimension", schema: FittingDimensionSchema },
            { name: "FittingVariant", schema: FittingVariantSchema },
            { name: "AngleRange", schema: AngleRangeSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([FittingDimension, FittingVariant, AngleRange])]),
  ],
  controllers: [FittingDimensionController],
  providers: [
    FittingDimensionService,
    repositoryProvider(
      FittingDimensionRepository,
      PostgresFittingDimensionRepository,
      MongoFittingDimensionRepository,
    ),
  ],
  exports: [FittingDimensionService],
})
export class FittingDimensionModule {}
