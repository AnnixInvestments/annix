import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FittingTypeController } from "./fitting-type.controller";
import { FittingTypeRepository } from "./fitting-type.repository";
import { MongoFittingTypeRepository } from "./fitting-type.repository.mongo";
import { FittingTypeService } from "./fitting-type.service";
import { FittingTypeSchema } from "./schemas/fitting-type.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "FittingType", schema: FittingTypeSchema }])],
  controllers: [FittingTypeController],
  providers: [
    FittingTypeService,
    repositoryProvider(FittingTypeRepository, MongoFittingTypeRepository),
  ],
  exports: [FittingTypeService],
})
export class FittingTypeModule {}
