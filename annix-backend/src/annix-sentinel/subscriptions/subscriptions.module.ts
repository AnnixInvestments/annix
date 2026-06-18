import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelSubscription } from "./entities/subscription.entity";
import { AnnixSentinelSubscriptionSchema } from "./schemas/subscription.schema";
import { AnnixSentinelSubscriptionRepository } from "./subscription.repository";
import { MongoAnnixSentinelSubscriptionRepository } from "./subscription.repository.mongo";
import { PostgresAnnixSentinelSubscriptionRepository } from "./subscription.repository.postgres";
import { AnnixSentinelSubscriptionsController } from "./subscriptions.controller";
import { AnnixSentinelSubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnnixSentinelSubscription", schema: AnnixSentinelSubscriptionSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([AnnixSentinelSubscription])]),
  ],
  controllers: [AnnixSentinelSubscriptionsController],
  providers: [
    AnnixSentinelSubscriptionsService,
    repositoryProvider(
      AnnixSentinelSubscriptionRepository,
      PostgresAnnixSentinelSubscriptionRepository,
      MongoAnnixSentinelSubscriptionRepository,
    ),
  ],
  exports: [AnnixSentinelSubscriptionsService],
})
export class AnnixSentinelSubscriptionsModule {}
