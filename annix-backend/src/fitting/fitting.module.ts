import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { MongoBoltMassRepository } from "../bolt-mass/bolt-mass.repository.mongo";
import { PostgresBoltMassRepository } from "../bolt-mass/bolt-mass.repository.postgres";
import { BoltMass } from "../bolt-mass/entities/bolt-mass.entity";
import { BoltMassSchema } from "../bolt-mass/schemas/bolt-mass.schema";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { MongoFlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository.mongo";
import { PostgresFlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository.postgres";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { MongoNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.mongo";
import { PostgresNbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository.postgres";
import { NbNpsLookupSchema } from "../nb-nps-lookup/schemas/nb-nps-lookup.schema";
import { NominalOutsideDiameterMm } from "../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { MongoNutMassRepository } from "../nut-mass/nut-mass.repository.mongo";
import { PostgresNutMassRepository } from "../nut-mass/nut-mass.repository.postgres";
import { NutMassSchema } from "../nut-mass/schemas/nut-mass.schema";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.mongo";
import { PostgresPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.postgres";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { Sabs62FittingDimension } from "../sabs62-fitting-dimension/entities/sabs62-fitting-dimension.entity";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { MongoSabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository.mongo";
import { PostgresSabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository.postgres";
import { Sabs62FittingDimensionSchema } from "../sabs62-fitting-dimension/schemas/sabs62-fitting-dimension.schema";
import { Sabs719FittingDimension } from "../sabs719-fitting-dimension/entities/sabs719-fitting-dimension.entity";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { MongoSabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository.mongo";
import { PostgresSabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository.postgres";
import { Sabs719FittingDimensionSchema } from "../sabs719-fitting-dimension/schemas/sabs719-fitting-dimension.schema";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { SteelSpecificationSchema } from "../steel-specification/schemas/steel-specification.schema";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { MongoSteelSpecificationRepository } from "../steel-specification/steel-specification.repository.mongo";
import { PostgresSteelSpecificationRepository } from "../steel-specification/steel-specification.repository.postgres";
import { Fitting } from "./entities/fitting.entity";
import { FittingController } from "./fitting.controller";
import { FittingRepository } from "./fitting.repository";
import { MongoFittingRepository } from "./fitting.repository.mongo";
import { PostgresFittingRepository } from "./fitting.repository.postgres";
import { FittingService } from "./fitting.service";
import { FittingSchema } from "./schemas/fitting.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            Bolt,
            FlangePressureClass,
            FlangeStandard,
            NominalOutsideDiameterMm,
            Fitting,
            Sabs62FittingDimension,
            Sabs719FittingDimension,
            PipeDimension,
            NbNpsLookup,
            FlangeDimension,
            BoltMass,
            NutMass,
            SteelSpecification,
          ]),
        ]),
  ],
  controllers: [FittingController],
  providers: [
    FittingService,
    repositoryProvider(FittingRepository, PostgresFittingRepository, MongoFittingRepository),
    repositoryProvider(
      Sabs62FittingDimensionRepository,
      PostgresSabs62FittingDimensionRepository,
      MongoSabs62FittingDimensionRepository,
    ),
    repositoryProvider(
      Sabs719FittingDimensionRepository,
      PostgresSabs719FittingDimensionRepository,
      MongoSabs719FittingDimensionRepository,
    ),
    repositoryProvider(
      PipeDimensionRepository,
      PostgresPipeDimensionRepository,
      MongoPipeDimensionRepository,
    ),
    repositoryProvider(
      NbNpsLookupRepository,
      PostgresNbNpsLookupRepository,
      MongoNbNpsLookupRepository,
    ),
    repositoryProvider(
      FlangeDimensionRepository,
      PostgresFlangeDimensionRepository,
      MongoFlangeDimensionRepository,
    ),
    repositoryProvider(BoltMassRepository, PostgresBoltMassRepository, MongoBoltMassRepository),
    repositoryProvider(NutMassRepository, PostgresNutMassRepository, MongoNutMassRepository),
    repositoryProvider(
      SteelSpecificationRepository,
      PostgresSteelSpecificationRepository,
      MongoSteelSpecificationRepository,
    ),
  ],
  exports: [FittingService],
})
export class FittingModule {}
