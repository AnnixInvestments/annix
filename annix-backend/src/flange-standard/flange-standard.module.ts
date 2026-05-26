import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardController } from "./flange-standard.controller";
import { FlangeStandardRepository } from "./flange-standard.repository";
import { MongoFlangeStandardRepository } from "./flange-standard.repository.mongo";
import { PostgresFlangeStandardRepository } from "./flange-standard.repository.postgres";
import { FlangeStandardService } from "./flange-standard.service";
import { FlangeStandardSchema } from "./schemas/flange-standard.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "FlangeStandard", schema: FlangeStandardSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FlangeStandard])]),
  ],
  controllers: [FlangeStandardController],
  providers: [
    FlangeStandardService,
    repositoryProvider(
      FlangeStandardRepository,
      PostgresFlangeStandardRepository,
      MongoFlangeStandardRepository,
    ),
  ],
  exports: [FlangeStandardService],
})
export class FlangeStandardModule {}
