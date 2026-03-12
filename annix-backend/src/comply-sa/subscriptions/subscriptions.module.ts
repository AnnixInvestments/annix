import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaAuditLog } from "../compliance/entities/audit-log.entity";
import { ComplySaSubscription } from "./entities/subscription.entity";
import { ComplySaSubscriptionsController } from "./subscriptions.controller";
import { ComplySaSubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaSubscription, ComplySaAuditLog])],
  controllers: [ComplySaSubscriptionsController],
  providers: [ComplySaSubscriptionsService],
  exports: [ComplySaSubscriptionsService],
})
export class ComplySaSubscriptionsModule {}
