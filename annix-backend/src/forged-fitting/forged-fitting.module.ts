import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ForgedFittingDimension } from "./entities/forged-fitting-dimension.entity";
import { ForgedFittingPtRating } from "./entities/forged-fitting-pt-rating.entity";
import { ForgedFittingSeries } from "./entities/forged-fitting-series.entity";
import { ForgedFittingType } from "./entities/forged-fitting-type.entity";
import { ForgedFittingController } from "./forged-fitting.controller";
import { ForgedFittingService } from "./forged-fitting.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForgedFittingDimension,
      ForgedFittingSeries,
      ForgedFittingType,
      ForgedFittingPtRating,
    ]),
  ],
  controllers: [ForgedFittingController],
  providers: [ForgedFittingService],
  exports: [ForgedFittingService],
})
export class ForgedFittingModule {}
