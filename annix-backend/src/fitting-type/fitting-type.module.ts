import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FittingType } from "./entities/fitting-type.entity";
import { FittingTypeController } from "./fitting-type.controller";
import { FittingTypeRepository } from "./fitting-type.repository";
import { MongoFittingTypeRepository } from "./fitting-type.repository.mongo";
import { PostgresFittingTypeRepository } from "./fitting-type.repository.postgres";
import { FittingTypeService } from "./fitting-type.service";
import { FittingTypeSchema } from "./schemas/fitting-type.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "FittingType", schema: FittingTypeSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FittingType])]),
  ],
  controllers: [FittingTypeController],
  providers: [
    FittingTypeService,
    repositoryProvider(
      FittingTypeRepository,
      PostgresFittingTypeRepository,
      MongoFittingTypeRepository,
    ),
  ],
  exports: [FittingTypeService],
})
export class FittingTypeModule {}
