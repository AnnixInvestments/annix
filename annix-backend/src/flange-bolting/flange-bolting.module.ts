import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlangeBolting } from './entities/flange-bolting.entity';
import { FlangeBoltingMaterial } from './entities/flange-bolting-material.entity';
import { FlangeBoltingService } from './flange-bolting.service';
import { FlangeBoltingController } from './flange-bolting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FlangeBolting, FlangeBoltingMaterial])],
  controllers: [FlangeBoltingController],
  providers: [FlangeBoltingService],
  exports: [FlangeBoltingService],
})
export class FlangeBoltingModule {}
