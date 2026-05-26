import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { SteelSpecification } from "src/steel-specification/entities/steel-specification.entity";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { PipePressureSchema } from "../pipe-pressure/schemas/pipe-pressure.schema";
import { SteelSpecificationSchema } from "../steel-specification/schemas/steel-specification.schema";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionController } from "./pipe-dimension.controller";
import { PipeDimensionRepository } from "./pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "./pipe-dimension.repository.mongo";
import { PostgresPipeDimensionRepository } from "./pipe-dimension.repository.postgres";
import { PipeDimensionService } from "./pipe-dimension.service";
import { PipeDimensionSchema } from "./schemas/pipe-dimension.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PipeDimension", schema: PipeDimensionSchema },
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
            { name: "SteelSpecification", schema: SteelSpecificationSchema },
            { name: "PipePressure", schema: PipePressureSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([PipeDimension, NominalOutsideDiameterMm, SteelSpecification])]),
  ],
  providers: [
    PipeDimensionService,
    repositoryProvider(
      PipeDimensionRepository,
      PostgresPipeDimensionRepository,
      MongoPipeDimensionRepository,
    ),
  ],
  controllers: [PipeDimensionController],
  exports: [PipeDimensionService],
})
export class PipeDimensionModule {}
