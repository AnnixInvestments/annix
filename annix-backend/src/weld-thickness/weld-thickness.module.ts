import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WeldThicknessFittingRecommendation } from "./entities/weld-thickness-fitting-recommendation.entity";
import { WeldThicknessPipeRecommendation } from "./entities/weld-thickness-pipe-recommendation.entity";
import { WeldThicknessController } from "./weld-thickness.controller";
import { WeldThicknessService } from "./weld-thickness.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([WeldThicknessPipeRecommendation, WeldThicknessFittingRecommendation]),
  ],
  controllers: [WeldThicknessController],
  providers: [WeldThicknessService],
  exports: [WeldThicknessService],
})
export class WeldThicknessModule {}
