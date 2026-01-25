import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetainingRingWeightController } from './retaining-ring-weight.controller';
import { RetainingRingWeightService } from './retaining-ring-weight.service';
import { RetainingRingWeight } from './entities/retaining-ring-weight.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RetainingRingWeight])],
  controllers: [RetainingRingWeightController],
  providers: [RetainingRingWeightService],
  exports: [RetainingRingWeightService],
})
export class RetainingRingWeightModule {}
