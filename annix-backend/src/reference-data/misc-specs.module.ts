import { Module } from "@nestjs/common";
import { AngleRangeModule } from "../angle-range/angle-range.module";
import { BendCenterToFaceModule } from "../bend-center-to-face/bend-center-to-face.module";
import { BendDimensionModule } from "../bend-dimension/bend-dimension.module";
import { BnwSetWeightModule } from "../bnw-set-weight/bnw-set-weight.module";
import { CoatingSpecificationModule } from "../coating-specification/coating-specification.module";
import { MaterialCertificationModule } from "../material-certification/material-certification.module";
import { MaterialValidationModule } from "../material-validation/material-validation.module";
import { NbNpsLookupModule } from "../nb-nps-lookup/nb-nps-lookup.module";
import { NbOdLookupModule } from "../nb-od-lookup/nb-od-lookup.module";
import { ReducerCalculatorModule } from "../reducer-calculator/reducer-calculator.module";
import { RetainingRingWeightModule } from "../retaining-ring-weight/retaining-ring-weight.module";
import { SpectacleBlindModule } from "../spectacle-blind/spectacle-blind.module";
import { SweepTeeDimensionModule } from "../sweep-tee-dimension/sweep-tee-dimension.module";

@Module({
  imports: [
    AngleRangeModule,
    BendDimensionModule,
    BendCenterToFaceModule,
    SweepTeeDimensionModule,
    SpectacleBlindModule,
    ReducerCalculatorModule,
    NbNpsLookupModule,
    NbOdLookupModule,
    BnwSetWeightModule,
    RetainingRingWeightModule,
    MaterialValidationModule,
    MaterialCertificationModule,
    CoatingSpecificationModule,
  ],
  exports: [
    AngleRangeModule,
    BendDimensionModule,
    BendCenterToFaceModule,
    SweepTeeDimensionModule,
    SpectacleBlindModule,
    ReducerCalculatorModule,
    NbNpsLookupModule,
    NbOdLookupModule,
    BnwSetWeightModule,
    RetainingRingWeightModule,
    MaterialValidationModule,
    MaterialCertificationModule,
    CoatingSpecificationModule,
  ],
})
export class MiscSpecsModule {}
