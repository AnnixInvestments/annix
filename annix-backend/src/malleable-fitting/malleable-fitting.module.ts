import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MalleableFittingController } from "./malleable-fitting.controller";
import { MalleableFittingRepository } from "./malleable-fitting.repository";
import { MongoMalleableFittingRepository } from "./malleable-fitting.repository.mongo";
import { MalleableFittingService } from "./malleable-fitting.service";
import { MalleableIronFittingDimensionSchema } from "./schemas/malleable-iron-fitting-dimension.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "MalleableIronFittingDimension", schema: MalleableIronFittingDimensionSchema },
    ]),
  ],
  controllers: [MalleableFittingController],
  providers: [
    MalleableFittingService,
    repositoryProvider(MalleableFittingRepository, MongoMalleableFittingRepository),
  ],
  exports: [MalleableFittingService],
})
export class MalleableFittingModule {}
