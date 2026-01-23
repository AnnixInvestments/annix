import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasherService } from './washer.service';
import { WasherController } from './washer.controller';
import { Washer } from './entities/washer.entity';
import { Bolt } from '../bolt/entities/bolt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Washer, Bolt])],
  controllers: [WasherController],
  providers: [WasherService],
  exports: [WasherService],
})
export class WasherModule {}
