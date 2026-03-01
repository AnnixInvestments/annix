import { Module } from "@nestjs/common";
import { WeldJointEfficiencyModule } from "../weld-joint-efficiency/weld-joint-efficiency.module";
import { WeldThicknessModule } from "../weld-thickness/weld-thickness.module";
import { WeldTypeModule } from "../weld-type/weld-type.module";

@Module({
  imports: [WeldTypeModule, WeldJointEfficiencyModule, WeldThicknessModule],
  exports: [WeldTypeModule, WeldJointEfficiencyModule, WeldThicknessModule],
})
export class WeldSpecsModule {}
