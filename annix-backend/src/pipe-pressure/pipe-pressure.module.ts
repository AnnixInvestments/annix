import { Module } from '@nestjs/common';
import { PipePressureService } from './pipe-pressure.service';
import { PipePressureController } from './pipe-pressure.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipePressure } from './entities/pipe-pressure.entity';
import { PipeDimension } from 'src/pipe-dimension/entities/pipe-dimension.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PipePressure, PipeDimension])],
  providers: [PipePressureService],
  controllers: [PipePressureController],
  exports: [PipePressureService],
})
export class PipePressureModule {}
