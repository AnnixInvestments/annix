import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerProfile } from "../customer/entities";
import { EmailModule } from "../email/email.module";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { User } from "../user/entities/user.entity";
import { BroadcastService } from "./broadcast.service";
import {
  Broadcast,
  BroadcastRecipient,
  Conversation,
  ConversationParticipant,
  ConversationResponseMetric,
  Message,
  MessageAttachment,
  MessageReadReceipt,
  SlaConfig,
} from "./entities";
import { MessageNotificationService } from "./message-notification.service";
import { MessagingService } from "./messaging.service";
import { ResponseMetricsService } from "./response-metrics.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      MessageAttachment,
      MessageReadReceipt,
      ConversationResponseMetric,
      Broadcast,
      BroadcastRecipient,
      SlaConfig,
      User,
      CustomerProfile,
      SupplierProfile,
    ]),
    ConfigModule,
    EmailModule,
  ],
  providers: [
    MessagingService,
    ResponseMetricsService,
    BroadcastService,
    MessageNotificationService,
  ],
  exports: [MessagingService, ResponseMetricsService, BroadcastService, MessageNotificationService],
})
export class MessagingModule {}
