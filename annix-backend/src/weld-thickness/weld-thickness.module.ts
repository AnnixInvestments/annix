import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeldThicknessController } from './weld-thickness.controller';
import { WeldThicknessService } from './weld-thickness.service';
import { WeldThicknessPipeRecommendation } from './entities/weld-thickness-pipe-recommendation.entity';
import { WeldThicknessFittingRecommendation } from './entities/weld-thickness-fitting-recommendation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WeldThicknessPipeRecommendation,
      WeldThicknessFittingRecommendation,
    ]),
  ],
  controllers: [WeldThicknessController],
  providers: [WeldThicknessService],
  exports: [WeldThicknessService],
})
export class WeldThicknessModule {}
