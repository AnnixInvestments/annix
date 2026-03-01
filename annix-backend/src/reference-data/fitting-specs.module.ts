import { Module } from "@nestjs/common";
import { FittingModule } from "../fitting/fitting.module";
import { FittingBoreModule } from "../fitting-bore/fitting-bore.module";
import { FittingDimensionModule } from "../fitting-dimension/fitting-dimension.module";
import { FittingTypeModule } from "../fitting-type/fitting-type.module";
import { FittingVariantModule } from "../fitting-variant/fitting-variant.module";

@Module({
  imports: [
    FittingModule,
    FittingBoreModule,
    FittingDimensionModule,
    FittingTypeModule,
    FittingVariantModule,
  ],
  exports: [
    FittingModule,
    FittingBoreModule,
    FittingDimensionModule,
    FittingTypeModule,
    FittingVariantModule,
  ],
})
export class FittingSpecsModule {}
