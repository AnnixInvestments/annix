import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { ForgedFittingController } from "./forged-fitting.controller";
import { ForgedFittingRepository } from "./forged-fitting.repository";
import { MongoForgedFittingRepository } from "./forged-fitting.repository.mongo";
import { ForgedFittingService } from "./forged-fitting.service";
import { ForgedFittingDimensionSchema } from "./schemas/forged-fitting-dimension.schema";
import { ForgedFittingSeriesSchema } from "./schemas/forged-fitting-series.schema";
import { ForgedFittingTypeSchema } from "./schemas/forged-fitting-type.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "ForgedFittingDimension", schema: ForgedFittingDimensionSchema },
      { name: "ForgedFittingSeries", schema: ForgedFittingSeriesSchema },
      { name: "ForgedFittingType", schema: ForgedFittingTypeSchema },
    ]),
  ],
  controllers: [ForgedFittingController],
  providers: [
    ForgedFittingService,
    repositoryProvider(ForgedFittingRepository, MongoForgedFittingRepository),
  ],
  exports: [ForgedFittingService],
})
export class ForgedFittingModule {}
