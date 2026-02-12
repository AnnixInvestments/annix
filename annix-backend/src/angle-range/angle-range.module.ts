import { Module } from '@nestjs/common';
import { AngleRangeService } from './angle-range.service';
import { AngleRangeController } from './angle-range.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AngleRange } from './entities/angle-range.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AngleRange])],
  controllers: [AngleRangeController],
  providers: [AngleRangeService],
  exports: [AngleRangeService],
})
export class AngleRangeModule {}
