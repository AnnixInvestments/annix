import { Module } from "@nestjs/common";
import { FlangeDimensionModule } from "../../flange-dimension/flange-dimension.module";
import { NbOdLookupModule } from "../../nb-od-lookup/nb-od-lookup.module";
import { NixModule } from "../../nix/nix.module";
import { PipeScheduleModule } from "../../pipe-schedule/pipe-schedule.module";
import { M2CalculationService } from "../services/m2-calculation.service";

@Module({
  imports: [NixModule, NbOdLookupModule, PipeScheduleModule, FlangeDimensionModule],
  providers: [M2CalculationService],
  exports: [M2CalculationService],
})
export class M2CalculationModule {}
