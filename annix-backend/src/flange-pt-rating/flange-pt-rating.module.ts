import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangePtRating } from './entities/flange-pt-rating.entity';
import { FlangePtRatingService } from './flange-pt-rating.service';
import { FlangePtRatingController } from './flange-pt-rating.controller';
import { FlangePressureClass } from '../flange-pressure-class/entities/flange-pressure-class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FlangePtRating, FlangePressureClass])],
  controllers: [FlangePtRatingController],
  providers: [FlangePtRatingService],
  exports: [FlangePtRatingService],
})
export class FlangePtRatingModule {}
