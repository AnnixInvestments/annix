import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RetainingRingWeightController } from "./retaining-ring-weight.controller";
import { RetainingRingWeightRepository } from "./retaining-ring-weight.repository";
import { MongoRetainingRingWeightRepository } from "./retaining-ring-weight.repository.mongo";
import { RetainingRingWeightService } from "./retaining-ring-weight.service";
import { RetainingRingWeightSchema } from "./schemas/retaining-ring-weight.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "RetainingRingWeight", schema: RetainingRingWeightSchema }]),
  ],
  controllers: [RetainingRingWeightController],
  providers: [
    RetainingRingWeightService,
    repositoryProvider(RetainingRingWeightRepository, MongoRetainingRingWeightRepository),
  ],
  exports: [RetainingRingWeightService],
})
export class RetainingRingWeightModule {}
