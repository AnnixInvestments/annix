import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightController } from "./flange-type-weight.controller";
import { FlangeTypeWeightService } from "./flange-type-weight.service";

@Module({
  imports: [TypeOrmModule.forFeature([FlangeTypeWeight])],
  controllers: [FlangeTypeWeightController],
  providers: [FlangeTypeWeightService],
  exports: [FlangeTypeWeightService],
})
export class FlangeTypeWeightModule {}
