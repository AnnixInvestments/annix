import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipeSteelGrade, PipeAllowableStress } from './entities/steel-grade-stress.entity';
import { PipeScheduleWall, PipeNpsOd } from './entities/pipe-schedule-wall.entity';
import { PipeSizingService } from './pipe-sizing.service';
import { PipeSizingController } from './pipe-sizing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PipeSteelGrade, PipeAllowableStress, PipeScheduleWall, PipeNpsOd])],
  controllers: [PipeSizingController],
  providers: [PipeSizingService],
  exports: [PipeSizingService],
})
export class PipeSizingModule {}
