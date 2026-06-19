import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { MongoPipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository.mongo";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { PipePressureController } from "./pipe-pressure.controller";
import { PipePressureRepository } from "./pipe-pressure.repository";
import { MongoPipePressureRepository } from "./pipe-pressure.repository.mongo";
import { PipePressureService } from "./pipe-pressure.service";
import { PipePressureSchema } from "./schemas/pipe-pressure.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PipePressure", schema: PipePressureSchema },
      { name: "PipeDimension", schema: PipeDimensionSchema },
    ]),
  ],
  providers: [
    PipePressureService,
    repositoryProvider(PipePressureRepository, MongoPipePressureRepository),
    repositoryProvider(PipeDimensionRepository, MongoPipeDimensionRepository),
  ],
  controllers: [PipePressureController],
  exports: [PipePressureService],
})
export class PipePressureModule {}
