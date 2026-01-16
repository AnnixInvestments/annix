import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangeType } from './entities/flange-type.entity';
import { FlangeTypeService } from './flange-type.service';
import { FlangeTypeController } from './flange-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FlangeType])],
  controllers: [FlangeTypeController],
  providers: [FlangeTypeService],
  exports: [FlangeTypeService],
})
export class FlangeTypeModule {}
