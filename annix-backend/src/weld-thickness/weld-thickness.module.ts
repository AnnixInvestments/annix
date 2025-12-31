import { Module } from '@nestjs/common';
import { WeldThicknessController } from './weld-thickness.controller';
import { WeldThicknessService } from './weld-thickness.service';

@Module({
  controllers: [WeldThicknessController],
  providers: [WeldThicknessService],
  exports: [WeldThicknessService],
})
export class WeldThicknessModule {}
