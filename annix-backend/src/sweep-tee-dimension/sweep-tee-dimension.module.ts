import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";
import { SweepTeeDimensionController } from "./sweep-tee-dimension.controller";
import { SweepTeeDimensionService } from "./sweep-tee-dimension.service";

@Module({
  imports: [TypeOrmModule.forFeature([SweepTeeDimension])],
  controllers: [SweepTeeDimensionController],
  providers: [SweepTeeDimensionService],
  exports: [SweepTeeDimensionService],
})
export class SweepTeeDimensionModule {}
