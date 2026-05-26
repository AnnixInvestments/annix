import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { FittingVariantRepository } from "../fitting-variant/fitting-variant.repository";
import { MongoFittingVariantRepository } from "../fitting-variant/fitting-variant.repository.mongo";
import { PostgresFittingVariantRepository } from "../fitting-variant/fitting-variant.repository.postgres";
import { FittingVariantSchema } from "../fitting-variant/schemas/fitting-variant.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository";
import { MongoNominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository.mongo";
import { PostgresNominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository.postgres";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreController } from "./fitting-bore.controller";
import { FittingBoreRepository } from "./fitting-bore.repository";
import { MongoFittingBoreRepository } from "./fitting-bore.repository.mongo";
import { PostgresFittingBoreRepository } from "./fitting-bore.repository.postgres";
import { FittingBoreService } from "./fitting-bore.service";
import { FittingBoreSchema } from "./schemas/fitting-bore.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FittingBore", schema: FittingBoreSchema },
            { name: "FittingVariant", schema: FittingVariantSchema },
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([FittingBore, NominalOutsideDiameterMm, FittingVariant])]),
  ],
  providers: [
    FittingBoreService,
    repositoryProvider(
      FittingBoreRepository,
      PostgresFittingBoreRepository,
      MongoFittingBoreRepository,
    ),
    repositoryProvider(
      FittingVariantRepository,
      PostgresFittingVariantRepository,
      MongoFittingVariantRepository,
    ),
    repositoryProvider(
      NominalOutsideDiameterMmRepository,
      PostgresNominalOutsideDiameterMmRepository,
      MongoNominalOutsideDiameterMmRepository,
    ),
  ],
  controllers: [FittingBoreController],
})
export class FittingBoreModule {}
