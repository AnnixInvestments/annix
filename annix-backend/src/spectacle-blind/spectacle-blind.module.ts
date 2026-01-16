import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpectacleBlind } from './entities/spectacle-blind.entity';
import { SpectacleBlindService } from './spectacle-blind.service';
import { SpectacleBlindController } from './spectacle-blind.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpectacleBlind])],
  controllers: [SpectacleBlindController],
  providers: [SpectacleBlindService],
  exports: [SpectacleBlindService],
})
export class SpectacleBlindModule {}
