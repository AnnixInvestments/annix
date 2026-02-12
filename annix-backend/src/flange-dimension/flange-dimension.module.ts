import { Module } from '@nestjs/common';
import { FlangeDimensionService } from './flange-dimension.service';
import { FlangeDimensionController } from './flange-dimension.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangeDimension } from './entities/flange-dimension.entity';
import { NominalOutsideDiameterMm } from 'src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FlangeStandard } from 'src/flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from 'src/flange-pressure-class/entities/flange-pressure-class.entity';
import { Bolt } from 'src/bolt/entities/bolt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlangeDimension, NominalOutsideDiameterMm, FlangeStandard, FlangePressureClass, Bolt,
    ]),
  ],
  controllers: [FlangeDimensionController],
  providers: [FlangeDimensionService],
  exports: [FlangeDimensionService],
})
export class FlangeDimensionModule {}
