import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
  MessageReadReceipt,
  ConversationResponseMetric,
  Broadcast,
  BroadcastRecipient,
  SlaConfig,
} from './entities';
import { User } from '../user/entities/user.entity';
import { CustomerProfile } from '../customer/entities';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { MessagingService } from './messaging.service';
import { ResponseMetricsService } from './response-metrics.service';
import { BroadcastService } from './broadcast.service';
import { MessageNotificationService } from './message-notification.service';
import { EmailModule } from '../email/email.module';

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
  exports: [
    MessagingService,
    ResponseMetricsService,
    BroadcastService,
    MessageNotificationService,
  ],
})
export class MessagingModule {}
