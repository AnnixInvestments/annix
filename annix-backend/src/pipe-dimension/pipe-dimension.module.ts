import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { PipePressureSchema } from "../pipe-pressure/schemas/pipe-pressure.schema";
import { SteelSpecificationSchema } from "../steel-specification/schemas/steel-specification.schema";
import { PipeDimensionController } from "./pipe-dimension.controller";
import { PipeDimensionRepository } from "./pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "./pipe-dimension.repository.mongo";
import { PipeDimensionService } from "./pipe-dimension.service";
import { PipeDimensionSchema } from "./schemas/pipe-dimension.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PipeDimension", schema: PipeDimensionSchema },
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
      { name: "SteelSpecification", schema: SteelSpecificationSchema },
      { name: "PipePressure", schema: PipePressureSchema },
    ]),
  ],
  providers: [
    PipeDimensionService,
    repositoryProvider(PipeDimensionRepository, MongoPipeDimensionRepository),
  ],
  controllers: [PipeDimensionController],
  exports: [PipeDimensionService],
})
export class PipeDimensionModule {}
