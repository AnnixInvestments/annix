import { Module } from '@nestjs/common';
import { FittingVariantService } from './fitting-variant.service';
import { FittingVariantController } from './fitting-variant.controller';
import { FittingVariant } from './entities/fitting-variant.entity';
import { FittingBore } from 'src/fitting-bore/entities/fitting-bore.entity';
import { FittingDimension } from 'src/fitting-dimension/entities/fitting-dimension.entity';
import { Fitting } from 'src/fitting/entities/fitting.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fitting, FittingVariant, FittingBore, FittingDimension]),
  ],
  controllers: [FittingVariantController],
  providers: [FittingVariantService],
})
export class FittingVariantModule {}
