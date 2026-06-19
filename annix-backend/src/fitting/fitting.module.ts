import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { MongoBoltMassRepository } from "../bolt-mass/bolt-mass.repository.mongo";
import { BoltMassSchema } from "../bolt-mass/schemas/bolt-mass.schema";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { MongoFlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository.mongo";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.mongo";
import { NbNpsLookupSchema } from "../nb-nps-lookup/schemas/nb-nps-lookup.schema";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { MongoNutMassRepository } from "../nut-mass/nut-mass.repository.mongo";
import { NutMassSchema } from "../nut-mass/schemas/nut-mass.schema";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.mongo";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { MongoSabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository.mongo";
import { Sabs62FittingDimensionSchema } from "../sabs62-fitting-dimension/schemas/sabs62-fitting-dimension.schema";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { MongoSabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository.mongo";
import { Sabs719FittingDimensionSchema } from "../sabs719-fitting-dimension/schemas/sabs719-fitting-dimension.schema";
import { SteelSpecificationSchema } from "../steel-specification/schemas/steel-specification.schema";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { MongoSteelSpecificationRepository } from "../steel-specification/steel-specification.repository.mongo";
import { FittingController } from "./fitting.controller";
import { FittingRepository } from "./fitting.repository";
import { MongoFittingRepository } from "./fitting.repository.mongo";
import { FittingService } from "./fitting.service";
import { FittingSchema } from "./schemas/fitting.schema";

@Module({
  imports: [
    FlangeTypeWeightModule,
    MongooseModule.forFeature([
      { name: "Fitting", schema: FittingSchema },
      { name: "Sabs62FittingDimension", schema: Sabs62FittingDimensionSchema },
      { name: "Sabs719FittingDimension", schema: Sabs719FittingDimensionSchema },
      { name: "PipeDimension", schema: PipeDimensionSchema },
      { name: "NbNpsLookup", schema: NbNpsLookupSchema },
      { name: "FlangeDimension", schema: FlangeDimensionSchema },
      { name: "BoltMass", schema: BoltMassSchema },
      { name: "NutMass", schema: NutMassSchema },
      { name: "SteelSpecification", schema: SteelSpecificationSchema },
    ]),
  ],
  controllers: [FittingController],
  providers: [
    FittingService,
    repositoryProvider(FittingRepository, MongoFittingRepository),
    repositoryProvider(Sabs62FittingDimensionRepository, MongoSabs62FittingDimensionRepository),
    repositoryProvider(Sabs719FittingDimensionRepository, MongoSabs719FittingDimensionRepository),
    repositoryProvider(PipeDimensionRepository, MongoPipeDimensionRepository),
    repositoryProvider(NbNpsLookupRepository, MongoNbNpsLookupRepository),
    repositoryProvider(FlangeDimensionRepository, MongoFlangeDimensionRepository),
    repositoryProvider(BoltMassRepository, MongoBoltMassRepository),
    repositoryProvider(NutMassRepository, MongoNutMassRepository),
    repositoryProvider(SteelSpecificationRepository, MongoSteelSpecificationRepository),
  ],
  exports: [FittingService],
})
export class FittingModule {}
