import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelSubscriptionSchema } from "./schemas/subscription.schema";
import { AnnixSentinelSubscriptionRepository } from "./subscription.repository";
import { MongoAnnixSentinelSubscriptionRepository } from "./subscription.repository.mongo";
import { AnnixSentinelSubscriptionsController } from "./subscriptions.controller";
import { AnnixSentinelSubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnnixSentinelSubscription", schema: AnnixSentinelSubscriptionSchema },
    ]),
  ],
  controllers: [AnnixSentinelSubscriptionsController],
  providers: [
    AnnixSentinelSubscriptionsService,
    repositoryProvider(
      AnnixSentinelSubscriptionRepository,
      MongoAnnixSentinelSubscriptionRepository,
    ),
  ],
  exports: [AnnixSentinelSubscriptionsService],
})
export class AnnixSentinelSubscriptionsModule {}
