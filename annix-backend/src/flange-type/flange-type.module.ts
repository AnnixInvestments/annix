import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeTypeController } from "./flange-type.controller";
import { FlangeTypeRepository } from "./flange-type.repository";
import { MongoFlangeTypeRepository } from "./flange-type.repository.mongo";
import { FlangeTypeService } from "./flange-type.service";
import { FlangeTypeSchema } from "./schemas/flange-type.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "FlangeType", schema: FlangeTypeSchema }])],
  controllers: [FlangeTypeController],
  providers: [
    FlangeTypeService,
    repositoryProvider(FlangeTypeRepository, MongoFlangeTypeRepository),
  ],
  exports: [FlangeTypeService],
})
export class FlangeTypeModule {}
