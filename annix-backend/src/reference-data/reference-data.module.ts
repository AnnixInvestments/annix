import { Module } from "@nestjs/common";
import { FastenerSpecsModule } from "./fastener-specs.module";
import { FittingSpecsModule } from "./fitting-specs.module";
import { FlangeSpecsModule } from "./flange-specs.module";
import { MiscSpecsModule } from "./misc-specs.module";
import { PipeSpecsModule } from "./pipe-specs.module";
import { WeldSpecsModule } from "./weld-specs.module";

@Module({
  imports: [
    PipeSpecsModule,
    FlangeSpecsModule,
    FittingSpecsModule,
    FastenerSpecsModule,
    WeldSpecsModule,
    MiscSpecsModule,
  ],
  exports: [
    PipeSpecsModule,
    FlangeSpecsModule,
    FittingSpecsModule,
    FastenerSpecsModule,
    WeldSpecsModule,
    MiscSpecsModule,
  ],
})
export class ReferenceDataModule {}
