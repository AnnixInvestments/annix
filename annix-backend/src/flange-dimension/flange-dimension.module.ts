import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltSchema } from "src/bolt/schemas/bolt.schema";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { BoltMassSchema } from "src/bolt-mass/schemas/bolt-mass.schema";
import { FlangePressureClass } from "src/flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangePressureClassSchema } from "src/flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { FlangeStandardSchema } from "src/flange-standard/schemas/flange-standard.schema";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmSchema } from "src/nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeDimension } from "./entities/flange-dimension.entity";
import { FlangeDimensionController } from "./flange-dimension.controller";
import { FlangeDimensionRepository } from "./flange-dimension.repository";
import { MongoFlangeDimensionRepository } from "./flange-dimension.repository.mongo";
import { PostgresFlangeDimensionRepository } from "./flange-dimension.repository.postgres";
import { FlangeDimensionService } from "./flange-dimension.service";
import { FlangeDimensionSchema } from "./schemas/flange-dimension.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FlangeDimension", schema: FlangeDimensionSchema },
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
            { name: "FlangeStandard", schema: FlangeStandardSchema },
            { name: "FlangePressureClass", schema: FlangePressureClassSchema },
            { name: "Bolt", schema: BoltSchema },
            { name: "BoltMass", schema: BoltMassSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            FlangeDimension,
            NominalOutsideDiameterMm,
            FlangeStandard,
            FlangePressureClass,
            Bolt,
            BoltMass,
          ]),
        ]),
  ],
  controllers: [FlangeDimensionController],
  providers: [
    FlangeDimensionService,
    repositoryProvider(
      FlangeDimensionRepository,
      PostgresFlangeDimensionRepository,
      MongoFlangeDimensionRepository,
    ),
  ],
  exports: [FlangeDimensionService],
})
export class FlangeDimensionModule {}
