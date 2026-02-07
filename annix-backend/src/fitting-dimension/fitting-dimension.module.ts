import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionController } from "./fitting-dimension.controller";
import { FittingDimensionService } from "./fitting-dimension.service";

@Module({
  imports: [TypeOrmModule.forFeature([FittingDimension, FittingVariant, AngleRange])],
  controllers: [FittingDimensionController],
  providers: [FittingDimensionService],
  exports: [FittingDimensionService],
})
export class FittingDimensionModule {}
