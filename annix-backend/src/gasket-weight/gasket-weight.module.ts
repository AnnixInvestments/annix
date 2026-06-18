import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { GasketWeight } from "./entities/gasket-weight.entity";
import { GasketWeightController } from "./gasket-weight.controller";
import { GasketWeightRepository } from "./gasket-weight.repository";
import { MongoGasketWeightRepository } from "./gasket-weight.repository.mongo";
import { PostgresGasketWeightRepository } from "./gasket-weight.repository.postgres";
import { GasketWeightService } from "./gasket-weight.service";
import { GasketWeightSchema } from "./schemas/gasket-weight.schema";

@Module({
  imports: [
    FlangeTypeWeightModule,
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "GasketWeight", schema: GasketWeightSchema },
            { name: "FlangeDimension", schema: FlangeDimensionSchema },
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
            { name: "FlangePressureClass", schema: FlangePressureClassSchema },
            { name: "FlangeStandard", schema: FlangeStandardSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([GasketWeight, FlangeDimension])]),
  ],
  controllers: [GasketWeightController],
  providers: [
    GasketWeightService,
    repositoryProvider(
      GasketWeightRepository,
      PostgresGasketWeightRepository,
      MongoGasketWeightRepository,
    ),
  ],
  exports: [GasketWeightService],
})
export class GasketWeightModule {}
