import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BnwSetWeightController } from "./bnw-set-weight.controller";
import { BnwSetWeightRepository } from "./bnw-set-weight.repository";
import { MongoBnwSetWeightRepository } from "./bnw-set-weight.repository.mongo";
import { PostgresBnwSetWeightRepository } from "./bnw-set-weight.repository.postgres";
import { BnwSetWeightService } from "./bnw-set-weight.service";
import { BnwSetWeight } from "./entities/bnw-set-weight.entity";
import { BnwSetWeightSchema } from "./schemas/bnw-set-weight.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "BnwSetWeight", schema: BnwSetWeightSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([BnwSetWeight])]),
  ],
  controllers: [BnwSetWeightController],
  providers: [
    BnwSetWeightService,
    repositoryProvider(
      BnwSetWeightRepository,
      PostgresBnwSetWeightRepository,
      MongoBnwSetWeightRepository,
    ),
  ],
  exports: [BnwSetWeightService],
})
export class BnwSetWeightModule {}
