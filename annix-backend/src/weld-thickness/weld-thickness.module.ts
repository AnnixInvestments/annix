import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { WeldThicknessFittingRecommendation } from "./entities/weld-thickness-fitting-recommendation.entity";
import { WeldThicknessPipeRecommendation } from "./entities/weld-thickness-pipe-recommendation.entity";
import { WeldThicknessFittingRecommendationSchema } from "./schemas/weld-thickness-fitting-recommendation.schema";
import { WeldThicknessPipeRecommendationSchema } from "./schemas/weld-thickness-pipe-recommendation.schema";
import { WeldThicknessController } from "./weld-thickness.controller";
import { WeldThicknessRepository } from "./weld-thickness.repository";
import { MongoWeldThicknessRepository } from "./weld-thickness.repository.mongo";
import { PostgresWeldThicknessRepository } from "./weld-thickness.repository.postgres";
import { WeldThicknessService } from "./weld-thickness.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            {
              name: "WeldThicknessFittingRecommendation",
              schema: WeldThicknessFittingRecommendationSchema,
            },
            {
              name: "WeldThicknessPipeRecommendation",
              schema: WeldThicknessPipeRecommendationSchema,
            },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            WeldThicknessPipeRecommendation,
            WeldThicknessFittingRecommendation,
          ]),
        ]),
  ],
  controllers: [WeldThicknessController],
  providers: [
    WeldThicknessService,
    repositoryProvider(
      WeldThicknessRepository,
      PostgresWeldThicknessRepository,
      MongoWeldThicknessRepository,
    ),
  ],
  exports: [WeldThicknessService],
})
export class WeldThicknessModule {}
