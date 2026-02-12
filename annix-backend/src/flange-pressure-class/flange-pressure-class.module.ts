import { Module } from '@nestjs/common';
import { FlangePressureClassService } from './flange-pressure-class.service';
import { FlangePressureClassController } from './flange-pressure-class.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangePressureClass } from './entities/flange-pressure-class.entity';
import { FlangeStandard } from 'src/flange-standard/entities/flange-standard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FlangePressureClass, FlangeStandard])],
  controllers: [FlangePressureClassController],
  providers: [FlangePressureClassService],
  exports: [FlangePressureClassService],
})
export class FlangePressureClassModule {}
