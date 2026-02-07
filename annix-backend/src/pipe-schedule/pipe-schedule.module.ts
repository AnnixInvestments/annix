import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MaterialAllowableStress } from "./entities/material-allowable-stress.entity";
import { PipeSchedule } from "./entities/pipe-schedule.entity";
import { PipeScheduleController } from "./pipe-schedule.controller";
import { PipeScheduleService } from "./pipe-schedule.service";

@Module({
  imports: [TypeOrmModule.forFeature([PipeSchedule, MaterialAllowableStress])],
  controllers: [PipeScheduleController],
  providers: [PipeScheduleService],
  exports: [PipeScheduleService],
})
export class PipeScheduleModule {}
