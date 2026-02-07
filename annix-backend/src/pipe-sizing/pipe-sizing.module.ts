import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PipeNpsOd, PipeScheduleWall } from "./entities/pipe-schedule-wall.entity";
import { PipeAllowableStress, PipeSteelGrade } from "./entities/steel-grade-stress.entity";
import { PipeSizingController } from "./pipe-sizing.controller";
import { PipeSizingService } from "./pipe-sizing.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([PipeSteelGrade, PipeAllowableStress, PipeScheduleWall, PipeNpsOd]),
  ],
  controllers: [PipeSizingController],
  providers: [PipeSizingService],
  exports: [PipeSizingService],
})
export class PipeSizingModule {}
