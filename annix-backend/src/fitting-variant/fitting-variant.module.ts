import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Fitting } from "src/fitting/entities/fitting.entity";
import { FittingBore } from "src/fitting-bore/entities/fitting-bore.entity";
import { FittingDimension } from "src/fitting-dimension/entities/fitting-dimension.entity";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantController } from "./fitting-variant.controller";
import { FittingVariantService } from "./fitting-variant.service";

@Module({
  imports: [TypeOrmModule.forFeature([Fitting, FittingVariant, FittingBore, FittingDimension])],
  controllers: [FittingVariantController],
  providers: [FittingVariantService],
})
export class FittingVariantModule {}
