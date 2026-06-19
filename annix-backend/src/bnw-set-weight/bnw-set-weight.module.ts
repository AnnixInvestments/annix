import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BnwSetWeightController } from "./bnw-set-weight.controller";
import { BnwSetWeightRepository } from "./bnw-set-weight.repository";
import { MongoBnwSetWeightRepository } from "./bnw-set-weight.repository.mongo";
import { BnwSetWeightService } from "./bnw-set-weight.service";
import { BnwSetWeightSchema } from "./schemas/bnw-set-weight.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "BnwSetWeight", schema: BnwSetWeightSchema }])],
  controllers: [BnwSetWeightController],
  providers: [
    BnwSetWeightService,
    repositoryProvider(BnwSetWeightRepository, MongoBnwSetWeightRepository),
  ],
  exports: [BnwSetWeightService],
})
export class BnwSetWeightModule {}
