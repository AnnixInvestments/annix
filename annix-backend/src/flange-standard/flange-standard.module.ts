import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeStandardController } from "./flange-standard.controller";
import { FlangeStandardRepository } from "./flange-standard.repository";
import { MongoFlangeStandardRepository } from "./flange-standard.repository.mongo";
import { FlangeStandardService } from "./flange-standard.service";
import { FlangeStandardSchema } from "./schemas/flange-standard.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "FlangeStandard", schema: FlangeStandardSchema }])],
  controllers: [FlangeStandardController],
  providers: [
    FlangeStandardService,
    repositoryProvider(FlangeStandardRepository, MongoFlangeStandardRepository),
  ],
  exports: [FlangeStandardService],
})
export class FlangeStandardModule {}
