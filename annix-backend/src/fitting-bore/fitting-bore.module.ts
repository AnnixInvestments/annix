import { Module } from '@nestjs/common';
import { FittingBoreService } from './fitting-bore.service';
import { FittingBoreController } from './fitting-bore.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FittingBore } from './entities/fitting-bore.entity';
import { NominalOutsideDiameterMm } from 'src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FittingVariant } from 'src/fitting-variant/entities/fitting-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FittingBore, NominalOutsideDiameterMm, FittingVariant])],
  providers: [FittingBoreService],
  controllers: [FittingBoreController],
})
export class FittingBoreModule {}
