import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PvcController } from './pvc.controller';
import { PvcService } from './pvc.service';
import { PvcPipeSpecification } from './entities/pvc-pipe-specification.entity';
import { PvcFittingType } from './entities/pvc-fitting-type.entity';
import { PvcFittingWeight } from './entities/pvc-fitting-weight.entity';
import { PvcCementPrice } from './entities/pvc-cement-price.entity';
import { PvcStandard } from './entities/pvc-standard.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PvcPipeSpecification,
      PvcFittingType,
      PvcFittingWeight,
      PvcCementPrice,
      PvcStandard,
    ]),
  ],
  controllers: [PvcController],
  providers: [PvcService],
  exports: [PvcService],
})
export class PvcModule {}
