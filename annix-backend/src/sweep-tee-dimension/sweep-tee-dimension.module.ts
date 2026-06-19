import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SweepTeeDimensionSchema } from "./schemas/sweep-tee-dimension.schema";
import { SweepTeeDimensionController } from "./sweep-tee-dimension.controller";
import { SweepTeeDimensionRepository } from "./sweep-tee-dimension.repository";
import { MongoSweepTeeDimensionRepository } from "./sweep-tee-dimension.repository.mongo";
import { SweepTeeDimensionService } from "./sweep-tee-dimension.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "SweepTeeDimension", schema: SweepTeeDimensionSchema }]),
  ],
  controllers: [SweepTeeDimensionController],
  providers: [
    SweepTeeDimensionService,
    repositoryProvider(SweepTeeDimensionRepository, MongoSweepTeeDimensionRepository),
  ],
  exports: [SweepTeeDimensionService],
})
export class SweepTeeDimensionModule {}
