import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AnsiFittingController } from "./ansi-fitting.controller";
import {
  AnsiFittingDimensionRepository,
  AnsiFittingTypeRepository,
} from "./ansi-fitting.repository";
import {
  MongoAnsiFittingDimensionRepository,
  MongoAnsiFittingTypeRepository,
} from "./ansi-fitting.repository.mongo";
import { AnsiFittingService } from "./ansi-fitting.service";
import { AnsiB169FittingDimensionSchema } from "./schemas/ansi-b169-fitting-dimension.schema";
import { AnsiB169FittingTypeSchema } from "./schemas/ansi-b169-fitting-type.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnsiB169FittingDimension", schema: AnsiB169FittingDimensionSchema },
      { name: "AnsiB169FittingType", schema: AnsiB169FittingTypeSchema },
    ]),
  ],
  controllers: [AnsiFittingController],
  providers: [
    AnsiFittingService,
    repositoryProvider(AnsiFittingDimensionRepository, MongoAnsiFittingDimensionRepository),
    repositoryProvider(AnsiFittingTypeRepository, MongoAnsiFittingTypeRepository),
  ],
  exports: [AnsiFittingService],
})
export class AnsiFittingModule {}
