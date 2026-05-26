import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";
import { SweepTeeDimensionSchema } from "./schemas/sweep-tee-dimension.schema";
import { SweepTeeDimensionController } from "./sweep-tee-dimension.controller";
import { SweepTeeDimensionRepository } from "./sweep-tee-dimension.repository";
import { MongoSweepTeeDimensionRepository } from "./sweep-tee-dimension.repository.mongo";
import { PostgresSweepTeeDimensionRepository } from "./sweep-tee-dimension.repository.postgres";
import { SweepTeeDimensionService } from "./sweep-tee-dimension.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "SweepTeeDimension", schema: SweepTeeDimensionSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([SweepTeeDimension])]),
  ],
  controllers: [SweepTeeDimensionController],
  providers: [
    SweepTeeDimensionService,
    repositoryProvider(
      SweepTeeDimensionRepository,
      PostgresSweepTeeDimensionRepository,
      MongoSweepTeeDimensionRepository,
    ),
  ],
  exports: [SweepTeeDimensionService],
})
export class SweepTeeDimensionModule {}
