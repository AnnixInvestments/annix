import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FittingVariantRepository } from "../fitting-variant/fitting-variant.repository";
import { MongoFittingVariantRepository } from "../fitting-variant/fitting-variant.repository.mongo";
import { FittingVariantSchema } from "../fitting-variant/schemas/fitting-variant.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository";
import { MongoNominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository.mongo";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { FittingBoreController } from "./fitting-bore.controller";
import { FittingBoreRepository } from "./fitting-bore.repository";
import { MongoFittingBoreRepository } from "./fitting-bore.repository.mongo";
import { FittingBoreService } from "./fitting-bore.service";
import { FittingBoreSchema } from "./schemas/fitting-bore.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FittingBore", schema: FittingBoreSchema },
      { name: "FittingVariant", schema: FittingVariantSchema },
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
    ]),
  ],
  providers: [
    FittingBoreService,
    repositoryProvider(FittingBoreRepository, MongoFittingBoreRepository),
    repositoryProvider(FittingVariantRepository, MongoFittingVariantRepository),
    repositoryProvider(NominalOutsideDiameterMmRepository, MongoNominalOutsideDiameterMmRepository),
  ],
  controllers: [FittingBoreController],
})
export class FittingBoreModule {}
