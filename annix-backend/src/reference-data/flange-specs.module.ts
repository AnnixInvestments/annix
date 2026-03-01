import { Module } from "@nestjs/common";
import { FlangeBoltingModule } from "../flange-bolting/flange-bolting.module";
import { FlangeDimensionModule } from "../flange-dimension/flange-dimension.module";
import { FlangePressureClassModule } from "../flange-pressure-class/flange-pressure-class.module";
import { FlangePtRatingModule } from "../flange-pt-rating/flange-pt-rating.module";
import { FlangeStandardModule } from "../flange-standard/flange-standard.module";
import { FlangeTypeModule } from "../flange-type/flange-type.module";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";

@Module({
  imports: [
    FlangeStandardModule,
    FlangePressureClassModule,
    FlangePtRatingModule,
    FlangeBoltingModule,
    FlangeTypeModule,
    FlangeDimensionModule,
    FlangeTypeWeightModule,
  ],
  exports: [
    FlangeStandardModule,
    FlangePressureClassModule,
    FlangePtRatingModule,
    FlangeBoltingModule,
    FlangeTypeModule,
    FlangeDimensionModule,
    FlangeTypeWeightModule,
  ],
})
export class FlangeSpecsModule {}
