import { Module } from "@nestjs/common";
import { PipeDimensionModule } from "../pipe-dimension/pipe-dimension.module";
import { PipeEndConfigurationModule } from "../pipe-end-configuration/pipe-end-configuration.module";
import { PipePressureModule } from "../pipe-pressure/pipe-pressure.module";
import { PipeScheduleModule } from "../pipe-schedule/pipe-schedule.module";
import { PipeSizingModule } from "../pipe-sizing/pipe-sizing.module";

@Module({
  imports: [
    PipeDimensionModule,
    PipePressureModule,
    PipeScheduleModule,
    PipeSizingModule,
    PipeEndConfigurationModule,
  ],
  exports: [
    PipeDimensionModule,
    PipePressureModule,
    PipeScheduleModule,
    PipeSizingModule,
    PipeEndConfigurationModule,
  ],
})
export class PipeSpecsModule {}
