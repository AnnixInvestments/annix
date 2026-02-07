import { Module } from "@nestjs/common";
import { ThermalController } from "./thermal.controller";
import { ThermalService } from "./thermal.service";

@Module({
  controllers: [ThermalController],
  providers: [ThermalService],
  exports: [ThermalService],
})
export class ThermalModule {}
