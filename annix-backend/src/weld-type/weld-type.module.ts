import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { WeldTypeSchema } from "./schemas/weld-type.schema";
import { WeldTypeController } from "./weld-type.controller";
import { WeldTypeRepository } from "./weld-type.repository";
import { MongoWeldTypeRepository } from "./weld-type.repository.mongo";
import { WeldTypeService } from "./weld-type.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: "WeldType", schema: WeldTypeSchema }])],
  controllers: [WeldTypeController],
  providers: [WeldTypeService, repositoryProvider(WeldTypeRepository, MongoWeldTypeRepository)],
  exports: [WeldTypeService],
})
export class WeldTypeModule {}
