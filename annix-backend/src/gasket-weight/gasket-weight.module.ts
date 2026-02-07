import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { GasketWeight } from "./entities/gasket-weight.entity";
import { GasketWeightController } from "./gasket-weight.controller";
import { GasketWeightService } from "./gasket-weight.service";

@Module({
  imports: [TypeOrmModule.forFeature([GasketWeight, FlangeDimension])],
  controllers: [GasketWeightController],
  providers: [GasketWeightService],
  exports: [GasketWeightService],
})
export class GasketWeightModule {}
