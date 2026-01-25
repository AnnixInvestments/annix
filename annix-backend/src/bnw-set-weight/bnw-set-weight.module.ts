import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BnwSetWeightController } from './bnw-set-weight.controller';
import { BnwSetWeightService } from './bnw-set-weight.service';
import { BnwSetWeight } from './entities/bnw-set-weight.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BnwSetWeight])],
  controllers: [BnwSetWeightController],
  providers: [BnwSetWeightService],
  exports: [BnwSetWeightService],
})
export class BnwSetWeightModule {}
