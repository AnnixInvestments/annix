import { Module } from "@nestjs/common";
import { WeldJointEfficiencyController } from "./weld-joint-efficiency.controller";
import { WeldJointEfficiencyService } from "./weld-joint-efficiency.service";

@Module({
  controllers: [WeldJointEfficiencyController],
  providers: [WeldJointEfficiencyService],
  exports: [WeldJointEfficiencyService],
})
export class WeldJointEfficiencyModule {}
