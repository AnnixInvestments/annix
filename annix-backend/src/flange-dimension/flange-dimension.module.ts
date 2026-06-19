import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BoltSchema } from "src/bolt/schemas/bolt.schema";
import { BoltMassSchema } from "src/bolt-mass/schemas/bolt-mass.schema";
import { FlangePressureClassSchema } from "src/flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandardSchema } from "src/flange-standard/schemas/flange-standard.schema";
import { NominalOutsideDiameterMmSchema } from "src/nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeDimensionController } from "./flange-dimension.controller";
import { FlangeDimensionRepository } from "./flange-dimension.repository";
import { MongoFlangeDimensionRepository } from "./flange-dimension.repository.mongo";
import { FlangeDimensionService } from "./flange-dimension.service";
import { FlangeDimensionSchema } from "./schemas/flange-dimension.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FlangeDimension", schema: FlangeDimensionSchema },
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
      { name: "FlangeStandard", schema: FlangeStandardSchema },
      { name: "FlangePressureClass", schema: FlangePressureClassSchema },
      { name: "Bolt", schema: BoltSchema },
      { name: "BoltMass", schema: BoltMassSchema },
    ]),
  ],
  controllers: [FlangeDimensionController],
  providers: [
    FlangeDimensionService,
    repositoryProvider(FlangeDimensionRepository, MongoFlangeDimensionRepository),
  ],
  exports: [FlangeDimensionService],
})
export class FlangeDimensionModule {}
