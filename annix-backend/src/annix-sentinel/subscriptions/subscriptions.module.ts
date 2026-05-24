import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixSentinelSubscription } from "./entities/subscription.entity";
import { AnnixSentinelSubscriptionsController } from "./subscriptions.controller";
import { AnnixSentinelSubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [TypeOrmModule.forFeature([AnnixSentinelSubscription])],
  controllers: [AnnixSentinelSubscriptionsController],
  providers: [AnnixSentinelSubscriptionsService],
  exports: [AnnixSentinelSubscriptionsService],
})
export class AnnixSentinelSubscriptionsModule {}
