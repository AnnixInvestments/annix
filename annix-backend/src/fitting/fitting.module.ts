import { Module } from '@nestjs/common';
import { FittingService } from './fitting.service';
import { FittingController } from './fitting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sabs62FittingDimension } from '../sabs62-fitting-dimension/entities/sabs62-fitting-dimension.entity';
import { Sabs719FittingDimension } from '../sabs719-fitting-dimension/entities/sabs719-fitting-dimension.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';
import { BoltMass } from '../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../nut-mass/entities/nut-mass.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sabs62FittingDimension, 
      Sabs719FittingDimension,
      PipeDimension,
      NbNpsLookup,
      FlangeDimension,
      BoltMass,
      NutMass,
      SteelSpecification,
    ]),
  ],
  controllers: [FittingController],
  providers: [FittingService],
  exports: [FittingService],
})
export class FittingModule {}
