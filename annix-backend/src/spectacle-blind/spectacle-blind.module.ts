import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";
import { SpectacleBlindSchema } from "./schemas/spectacle-blind.schema";
import { SpectacleBlindController } from "./spectacle-blind.controller";
import { SpectacleBlindRepository } from "./spectacle-blind.repository";
import { MongoSpectacleBlindRepository } from "./spectacle-blind.repository.mongo";
import { PostgresSpectacleBlindRepository } from "./spectacle-blind.repository.postgres";
import { SpectacleBlindService } from "./spectacle-blind.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "SpectacleBlind", schema: SpectacleBlindSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([SpectacleBlind])]),
  ],
  controllers: [SpectacleBlindController],
  providers: [
    SpectacleBlindService,
    repositoryProvider(
      SpectacleBlindRepository,
      PostgresSpectacleBlindRepository,
      MongoSpectacleBlindRepository,
    ),
  ],
  exports: [SpectacleBlindService],
})
export class SpectacleBlindModule {}
