import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AngleRangeController } from "./angle-range.controller";
import { AngleRangeRepository } from "./angle-range.repository";
import { MongoAngleRangeRepository } from "./angle-range.repository.mongo";
import { PostgresAngleRangeRepository } from "./angle-range.repository.postgres";
import { AngleRangeService } from "./angle-range.service";
import { AngleRange } from "./entities/angle-range.entity";
import { AngleRangeSchema } from "./schemas/angle-range.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "AngleRange", schema: AngleRangeSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([AngleRange])]),
  ],
  controllers: [AngleRangeController],
  providers: [
    AngleRangeService,
    repositoryProvider(
      AngleRangeRepository,
      PostgresAngleRangeRepository,
      MongoAngleRangeRepository,
    ),
  ],
  exports: [AngleRangeService],
})
export class AngleRangeModule {}
