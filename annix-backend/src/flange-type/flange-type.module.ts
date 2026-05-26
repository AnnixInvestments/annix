import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeType } from "./entities/flange-type.entity";
import { FlangeTypeController } from "./flange-type.controller";
import { FlangeTypeRepository } from "./flange-type.repository";
import { MongoFlangeTypeRepository } from "./flange-type.repository.mongo";
import { PostgresFlangeTypeRepository } from "./flange-type.repository.postgres";
import { FlangeTypeService } from "./flange-type.service";
import { FlangeTypeSchema } from "./schemas/flange-type.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "FlangeType", schema: FlangeTypeSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FlangeType])]),
  ],
  controllers: [FlangeTypeController],
  providers: [
    FlangeTypeService,
    repositoryProvider(
      FlangeTypeRepository,
      PostgresFlangeTypeRepository,
      MongoFlangeTypeRepository,
    ),
  ],
  exports: [FlangeTypeService],
})
export class FlangeTypeModule {}
