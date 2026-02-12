import { Module } from '@nestjs/common';
import { WeldTypeService } from './weld-type.service';
import { WeldTypeController } from './weld-type.controller';
import { WeldType } from './entities/weld-type.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([WeldType])], 
  controllers: [WeldTypeController],
  providers: [WeldTypeService],
  exports: [WeldTypeService],
})
export class WeldTypeModule {}
