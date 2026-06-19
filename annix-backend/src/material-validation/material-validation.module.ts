import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MaterialValidationController } from "./material-validation.controller";
import { MaterialValidationRepository } from "./material-validation.repository";
import { MongoMaterialValidationRepository } from "./material-validation.repository.mongo";
import { MaterialValidationService } from "./material-validation.service";
import { MaterialLimitSchema } from "./schemas/material-limit.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "MaterialLimit", schema: MaterialLimitSchema }])],
  controllers: [MaterialValidationController],
  providers: [
    MaterialValidationService,
    repositoryProvider(MaterialValidationRepository, MongoMaterialValidationRepository),
  ],
  exports: [MaterialValidationService],
})
export class MaterialValidationModule {}
