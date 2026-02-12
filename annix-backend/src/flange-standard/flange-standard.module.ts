import { Module } from '@nestjs/common';
import { FlangeStandardService } from './flange-standard.service';
import { FlangeStandardController } from './flange-standard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangeStandard } from './entities/flange-standard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FlangeStandard])],
  controllers: [FlangeStandardController],
  providers: [FlangeStandardService],
  exports: [FlangeStandardService],
})
export class FlangeStandardModule {}
