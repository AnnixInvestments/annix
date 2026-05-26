import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { WeldType } from "./entities/weld-type.entity";
import { WeldTypeSchema } from "./schemas/weld-type.schema";
import { WeldTypeController } from "./weld-type.controller";
import { WeldTypeRepository } from "./weld-type.repository";
import { MongoWeldTypeRepository } from "./weld-type.repository.mongo";
import { PostgresWeldTypeRepository } from "./weld-type.repository.postgres";
import { WeldTypeService } from "./weld-type.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "WeldType", schema: WeldTypeSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([WeldType])]),
  ],
  controllers: [WeldTypeController],
  providers: [
    WeldTypeService,
    repositoryProvider(WeldTypeRepository, PostgresWeldTypeRepository, MongoWeldTypeRepository),
  ],
  exports: [WeldTypeService],
})
export class WeldTypeModule {}
