import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RetainingRingWeight } from "./entities/retaining-ring-weight.entity";
import { RetainingRingWeightController } from "./retaining-ring-weight.controller";
import { RetainingRingWeightService } from "./retaining-ring-weight.service";

@Module({
  imports: [TypeOrmModule.forFeature([RetainingRingWeight])],
  controllers: [RetainingRingWeightController],
  providers: [RetainingRingWeightService],
  exports: [RetainingRingWeightService],
})
export class RetainingRingWeightModule {}
