import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangePtRating } from "./entities/flange-pt-rating.entity";
import { FlangePtRatingController } from "./flange-pt-rating.controller";
import { FlangePtRatingService } from "./flange-pt-rating.service";

@Module({
  imports: [TypeOrmModule.forFeature([FlangePtRating, FlangePressureClass])],
  controllers: [FlangePtRatingController],
  providers: [FlangePtRatingService],
  exports: [FlangePtRatingService],
})
export class FlangePtRatingModule {}
