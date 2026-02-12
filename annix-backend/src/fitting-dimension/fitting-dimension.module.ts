import { Module } from '@nestjs/common';
import { FittingDimensionService } from './fitting-dimension.service';
import { FittingDimensionController } from './fitting-dimension.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FittingDimension } from './entities/fitting-dimension.entity';
import { FittingVariant } from 'src/fitting-variant/entities/fitting-variant.entity';
import { AngleRange } from 'src/angle-range/entities/angle-range.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FittingDimension, FittingVariant, AngleRange])],
  controllers: [FittingDimensionController],
  providers: [FittingDimensionService],
  exports: [FittingDimensionService],
})
export class FittingDimensionModule {}
