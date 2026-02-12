import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RfqController } from './rfq.controller';
import { RfqService } from './rfq.service';
import { Rfq } from './entities/rfq.entity';
import { RfqItem } from './entities/rfq-item.entity';
import { StraightPipeRfq } from './entities/straight-pipe-rfq.entity';
import { BendRfq } from './entities/bend-rfq.entity';
import { User } from '../user/entities/user.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { FlangeStandard } from '../flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from '../flange-pressure-class/entities/flange-pressure-class.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';
import { BoltMass } from '../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../nut-mass/entities/nut-mass.entity';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rfq,
      RfqItem,
      StraightPipeRfq,
      BendRfq,
      User,
      SteelSpecification,
      PipeDimension,
      FlangeStandard,
      FlangePressureClass,
      FlangeDimension,
      BoltMass,
      NutMass,
      NbNpsLookup,
    ]),
  ],
  controllers: [RfqController],
  providers: [RfqService],
  exports: [RfqService],
})
export class RfqModule {}
