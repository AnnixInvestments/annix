import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HdpeController } from './hdpe.controller';
import { HdpeService } from './hdpe.service';
import { HdpePipeSpecification } from './entities/hdpe-pipe-specification.entity';
import { HdpeFittingType } from './entities/hdpe-fitting-type.entity';
import { HdpeFittingWeight } from './entities/hdpe-fitting-weight.entity';
import { HdpeButtweldPrice } from './entities/hdpe-buttweld-price.entity';
import { HdpeStubPrice } from './entities/hdpe-stub-price.entity';
import { HdpeStandard } from './entities/hdpe-standard.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HdpePipeSpecification,
      HdpeFittingType,
      HdpeFittingWeight,
      HdpeButtweldPrice,
      HdpeStubPrice,
      HdpeStandard,
    ]),
  ],
  controllers: [HdpeController],
  providers: [HdpeService],
  exports: [HdpeService],
})
export class HdpeModule {}
