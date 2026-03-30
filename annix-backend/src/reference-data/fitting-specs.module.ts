import { Module } from "@nestjs/common";
import { AnsiFittingModule } from "../ansi-fitting/ansi-fitting.module";
import { FittingModule } from "../fitting/fitting.module";
import { FittingBoreModule } from "../fitting-bore/fitting-bore.module";
import { FittingDimensionModule } from "../fitting-dimension/fitting-dimension.module";
import { FittingTypeModule } from "../fitting-type/fitting-type.module";
import { FittingVariantModule } from "../fitting-variant/fitting-variant.module";
import { ForgedFittingModule } from "../forged-fitting/forged-fitting.module";
import { MalleableFittingModule } from "../malleable-fitting/malleable-fitting.module";

@Module({
  imports: [
    AnsiFittingModule,
    FittingModule,
    FittingBoreModule,
    FittingDimensionModule,
    FittingTypeModule,
    FittingVariantModule,
    ForgedFittingModule,
    MalleableFittingModule,
  ],
  exports: [
    AnsiFittingModule,
    FittingModule,
    FittingBoreModule,
    FittingDimensionModule,
    FittingTypeModule,
    FittingVariantModule,
    ForgedFittingModule,
    MalleableFittingModule,
  ],
})
export class FittingSpecsModule {}
