import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipeSchedule } from './entities/pipe-schedule.entity';
import { MaterialAllowableStress } from './entities/material-allowable-stress.entity';
import { PipeScheduleService } from './pipe-schedule.service';
import { PipeScheduleController } from './pipe-schedule.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PipeSchedule, MaterialAllowableStress])],
  controllers: [PipeScheduleController],
  providers: [PipeScheduleService],
  exports: [PipeScheduleService],
})
export class PipeScheduleModule {}
