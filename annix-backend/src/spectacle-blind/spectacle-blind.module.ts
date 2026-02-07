import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";
import { SpectacleBlindController } from "./spectacle-blind.controller";
import { SpectacleBlindService } from "./spectacle-blind.service";

@Module({
  imports: [TypeOrmModule.forFeature([SpectacleBlind])],
  controllers: [SpectacleBlindController],
  providers: [SpectacleBlindService],
  exports: [SpectacleBlindService],
})
export class SpectacleBlindModule {}
