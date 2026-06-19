import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { GasketWeightController } from "./gasket-weight.controller";
import { GasketWeightRepository } from "./gasket-weight.repository";
import { MongoGasketWeightRepository } from "./gasket-weight.repository.mongo";
import { GasketWeightService } from "./gasket-weight.service";
import { GasketWeightSchema } from "./schemas/gasket-weight.schema";

@Module({
  imports: [
    FlangeTypeWeightModule,
    MongooseModule.forFeature([
      { name: "GasketWeight", schema: GasketWeightSchema },
      { name: "FlangeDimension", schema: FlangeDimensionSchema },
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
      { name: "FlangePressureClass", schema: FlangePressureClassSchema },
      { name: "FlangeStandard", schema: FlangeStandardSchema },
    ]),
  ],
  controllers: [GasketWeightController],
  providers: [
    GasketWeightService,
    repositoryProvider(GasketWeightRepository, MongoGasketWeightRepository),
  ],
  exports: [GasketWeightService],
})
export class GasketWeightModule {}
