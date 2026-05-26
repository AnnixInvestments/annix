import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MaterialLimit } from "./entities/material-limit.entity";
import { MaterialValidationController } from "./material-validation.controller";
import { MaterialValidationRepository } from "./material-validation.repository";
import { MongoMaterialValidationRepository } from "./material-validation.repository.mongo";
import { PostgresMaterialValidationRepository } from "./material-validation.repository.postgres";
import { MaterialValidationService } from "./material-validation.service";
import { MaterialLimitSchema } from "./schemas/material-limit.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "MaterialLimit", schema: MaterialLimitSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([MaterialLimit])]),
  ],
  controllers: [MaterialValidationController],
  providers: [
    MaterialValidationService,
    repositoryProvider(
      MaterialValidationRepository,
      PostgresMaterialValidationRepository,
      MongoMaterialValidationRepository,
    ),
  ],
  exports: [MaterialValidationService],
})
export class MaterialValidationModule {}
