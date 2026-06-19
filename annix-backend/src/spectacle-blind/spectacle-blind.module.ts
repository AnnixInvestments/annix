import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SpectacleBlindSchema } from "./schemas/spectacle-blind.schema";
import { SpectacleBlindController } from "./spectacle-blind.controller";
import { SpectacleBlindRepository } from "./spectacle-blind.repository";
import { MongoSpectacleBlindRepository } from "./spectacle-blind.repository.mongo";
import { SpectacleBlindService } from "./spectacle-blind.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: "SpectacleBlind", schema: SpectacleBlindSchema }])],
  controllers: [SpectacleBlindController],
  providers: [
    SpectacleBlindService,
    repositoryProvider(SpectacleBlindRepository, MongoSpectacleBlindRepository),
  ],
  exports: [SpectacleBlindService],
})
export class SpectacleBlindModule {}
