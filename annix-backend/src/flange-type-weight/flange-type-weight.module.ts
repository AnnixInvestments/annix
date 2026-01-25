import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangeTypeWeightController } from './flange-type-weight.controller';
import { FlangeTypeWeightService } from './flange-type-weight.service';
import { FlangeTypeWeight } from './entities/flange-type-weight.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FlangeTypeWeight])],
  controllers: [FlangeTypeWeightController],
  providers: [FlangeTypeWeightService],
  exports: [FlangeTypeWeightService],
})
export class FlangeTypeWeightModule {}
