import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RubberLiningController } from './rubber-lining.controller';
import { RubberLiningService } from './rubber-lining.service';
import { RubberType } from './entities/rubber-type.entity';
import { RubberSpecification } from './entities/rubber-specification.entity';
import {
  RubberApplicationRating,
  RubberThicknessRecommendation,
  RubberAdhesionRequirement,
} from './entities/rubber-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RubberType,
      RubberSpecification,
      RubberApplicationRating,
      RubberThicknessRecommendation,
      RubberAdhesionRequirement,
    ]),
  ],
  controllers: [RubberLiningController],
  providers: [RubberLiningService],
  exports: [RubberLiningService],
})
export class RubberLiningModule {}
