import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { ForgedFittingDimension } from "./entities/forged-fitting-dimension.entity";
import { ForgedFittingPtRating } from "./entities/forged-fitting-pt-rating.entity";
import { ForgedFittingSeries } from "./entities/forged-fitting-series.entity";
import { ForgedFittingType } from "./entities/forged-fitting-type.entity";
import { ForgedFittingController } from "./forged-fitting.controller";
import { ForgedFittingRepository } from "./forged-fitting.repository";
import { MongoForgedFittingRepository } from "./forged-fitting.repository.mongo";
import { PostgresForgedFittingRepository } from "./forged-fitting.repository.postgres";
import { ForgedFittingService } from "./forged-fitting.service";
import { ForgedFittingDimensionSchema } from "./schemas/forged-fitting-dimension.schema";
import { ForgedFittingSeriesSchema } from "./schemas/forged-fitting-series.schema";
import { ForgedFittingTypeSchema } from "./schemas/forged-fitting-type.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "ForgedFittingDimension", schema: ForgedFittingDimensionSchema },
            { name: "ForgedFittingSeries", schema: ForgedFittingSeriesSchema },
            { name: "ForgedFittingType", schema: ForgedFittingTypeSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            ForgedFittingDimension,
            ForgedFittingSeries,
            ForgedFittingType,
            ForgedFittingPtRating,
          ]),
        ]),
  ],
  controllers: [ForgedFittingController],
  providers: [
    ForgedFittingService,
    repositoryProvider(
      ForgedFittingRepository,
      PostgresForgedFittingRepository,
      MongoForgedFittingRepository,
    ),
  ],
  exports: [ForgedFittingService],
})
export class ForgedFittingModule {}
