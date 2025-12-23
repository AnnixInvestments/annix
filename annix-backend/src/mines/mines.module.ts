import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MinesController } from './mines.controller';
import { MinesService } from './mines.service';
import { Commodity } from './entities/commodity.entity';
import { SaMine } from './entities/sa-mine.entity';
import { SlurryProfile } from './entities/slurry-profile.entity';
import { LiningCoatingRule } from './entities/lining-coating-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commodity, SaMine, SlurryProfile, LiningCoatingRule]),
  ],
  controllers: [MinesController],
  providers: [MinesService],
  exports: [MinesService],
})
export class MinesModule {}
