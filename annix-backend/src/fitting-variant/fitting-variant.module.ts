import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Fitting } from "src/fitting/entities/fitting.entity";
import { FittingRepository } from "src/fitting/fitting.repository";
import { MongoFittingRepository } from "src/fitting/fitting.repository.mongo";
import { PostgresFittingRepository } from "src/fitting/fitting.repository.postgres";
import { FittingSchema } from "src/fitting/schemas/fitting.schema";
import { FittingBore } from "src/fitting-bore/entities/fitting-bore.entity";
import { FittingBoreRepository } from "src/fitting-bore/fitting-bore.repository";
import { MongoFittingBoreRepository } from "src/fitting-bore/fitting-bore.repository.mongo";
import { PostgresFittingBoreRepository } from "src/fitting-bore/fitting-bore.repository.postgres";
import { FittingBoreSchema } from "src/fitting-bore/schemas/fitting-bore.schema";
import { FittingDimension } from "src/fitting-dimension/entities/fitting-dimension.entity";
import { FittingDimensionRepository } from "src/fitting-dimension/fitting-dimension.repository";
import { MongoFittingDimensionRepository } from "src/fitting-dimension/fitting-dimension.repository.mongo";
import { PostgresFittingDimensionRepository } from "src/fitting-dimension/fitting-dimension.repository.postgres";
import { FittingDimensionSchema } from "src/fitting-dimension/schemas/fitting-dimension.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantController } from "./fitting-variant.controller";
import { FittingVariantRepository } from "./fitting-variant.repository";
import { MongoFittingVariantRepository } from "./fitting-variant.repository.mongo";
import { PostgresFittingVariantRepository } from "./fitting-variant.repository.postgres";
import { FittingVariantService } from "./fitting-variant.service";
import { FittingVariantSchema } from "./schemas/fitting-variant.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FittingVariant", schema: FittingVariantSchema },
            { name: "Fitting", schema: FittingSchema },
            { name: "FittingBore", schema: FittingBoreSchema },
            { name: "FittingDimension", schema: FittingDimensionSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([Fitting, FittingVariant, FittingBore, FittingDimension])]),
  ],
  controllers: [FittingVariantController],
  providers: [
    FittingVariantService,
    repositoryProvider(
      FittingVariantRepository,
      PostgresFittingVariantRepository,
      MongoFittingVariantRepository,
    ),
    repositoryProvider(FittingRepository, PostgresFittingRepository, MongoFittingRepository),
    repositoryProvider(
      FittingBoreRepository,
      PostgresFittingBoreRepository,
      MongoFittingBoreRepository,
    ),
    repositoryProvider(
      FittingDimensionRepository,
      PostgresFittingDimensionRepository,
      MongoFittingDimensionRepository,
    ),
  ],
})
export class FittingVariantModule {}
