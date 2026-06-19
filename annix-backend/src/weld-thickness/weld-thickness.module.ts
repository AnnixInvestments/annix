import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { WeldThicknessFittingRecommendationSchema } from "./schemas/weld-thickness-fitting-recommendation.schema";
import { WeldThicknessPipeRecommendationSchema } from "./schemas/weld-thickness-pipe-recommendation.schema";
import { WeldThicknessController } from "./weld-thickness.controller";
import { WeldThicknessRepository } from "./weld-thickness.repository";
import { MongoWeldThicknessRepository } from "./weld-thickness.repository.mongo";
import { WeldThicknessService } from "./weld-thickness.service";

@Module({
  imports: [
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
  ],
  controllers: [WeldThicknessController],
  providers: [
    WeldThicknessService,
    repositoryProvider(WeldThicknessRepository, MongoWeldThicknessRepository),
  ],
  exports: [WeldThicknessService],
})
export class WeldThicknessModule {}
