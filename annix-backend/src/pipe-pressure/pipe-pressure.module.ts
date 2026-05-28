import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PipeDimension } from "src/pipe-dimension/entities/pipe-dimension.entity";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMm } from "../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.mongo";
import { PostgresPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.postgres";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { PipePressure } from "./entities/pipe-pressure.entity";
import { PipePressureController } from "./pipe-pressure.controller";
import { PipePressureRepository } from "./pipe-pressure.repository";
import { MongoPipePressureRepository } from "./pipe-pressure.repository.mongo";
import { PostgresPipePressureRepository } from "./pipe-pressure.repository.postgres";
import { PipePressureService } from "./pipe-pressure.service";
import { PipePressureSchema } from "./schemas/pipe-pressure.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PipePressure", schema: PipePressureSchema },
            { name: "PipeDimension", schema: PipeDimensionSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            NominalOutsideDiameterMm,
            SteelSpecification,
            PipePressure,
            PipeDimension,
          ]),
        ]),
  ],
  providers: [
    PipePressureService,
    repositoryProvider(
      PipePressureRepository,
      PostgresPipePressureRepository,
      MongoPipePressureRepository,
    ),
    repositoryProvider(
      PipeDimensionRepository,
      PostgresPipeDimensionRepository,
      MongoPipeDimensionRepository,
    ),
  ],
  controllers: [PipePressureController],
  exports: [PipePressureService],
})
export class PipePressureModule {}
