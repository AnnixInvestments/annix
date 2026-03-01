import { Module } from "@nestjs/common";
import { BoltModule } from "../bolt/bolt.module";
import { BoltMassModule } from "../bolt-mass/bolt-mass.module";
import { GasketWeightModule } from "../gasket-weight/gasket-weight.module";
import { NutMassModule } from "../nut-mass/nut-mass.module";
import { WasherModule } from "../washer/washer.module";

@Module({
  imports: [BoltModule, BoltMassModule, NutMassModule, WasherModule, GasketWeightModule],
  exports: [BoltModule, BoltMassModule, NutMassModule, WasherModule, GasketWeightModule],
})
export class FastenerSpecsModule {}
