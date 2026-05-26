import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RetainingRingWeight } from "./entities/retaining-ring-weight.entity";
import { RetainingRingWeightController } from "./retaining-ring-weight.controller";
import { RetainingRingWeightRepository } from "./retaining-ring-weight.repository";
import { MongoRetainingRingWeightRepository } from "./retaining-ring-weight.repository.mongo";
import { PostgresRetainingRingWeightRepository } from "./retaining-ring-weight.repository.postgres";
import { RetainingRingWeightService } from "./retaining-ring-weight.service";
import { RetainingRingWeightSchema } from "./schemas/retaining-ring-weight.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "RetainingRingWeight", schema: RetainingRingWeightSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([RetainingRingWeight])]),
  ],
  controllers: [RetainingRingWeightController],
  providers: [
    RetainingRingWeightService,
    repositoryProvider(
      RetainingRingWeightRepository,
      PostgresRetainingRingWeightRepository,
      MongoRetainingRingWeightRepository,
    ),
  ],
  exports: [RetainingRingWeightService],
})
export class RetainingRingWeightModule {}
