import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AngleRangeController } from "./angle-range.controller";
import { AngleRangeRepository } from "./angle-range.repository";
import { MongoAngleRangeRepository } from "./angle-range.repository.mongo";
import { AngleRangeService } from "./angle-range.service";
import { AngleRangeSchema } from "./schemas/angle-range.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "AngleRange", schema: AngleRangeSchema }])],
  controllers: [AngleRangeController],
  providers: [
    AngleRangeService,
    repositoryProvider(AngleRangeRepository, MongoAngleRangeRepository),
  ],
  exports: [AngleRangeService],
})
export class AngleRangeModule {}
