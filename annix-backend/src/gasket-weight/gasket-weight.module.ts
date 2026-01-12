import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasketWeightController } from './gasket-weight.controller';
import { GasketWeightService } from './gasket-weight.service';
import { GasketWeight } from './entities/gasket-weight.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GasketWeight, FlangeDimension])],
  controllers: [GasketWeightController],
  providers: [GasketWeightService],
  exports: [GasketWeightService],
})
export class GasketWeightModule {}
