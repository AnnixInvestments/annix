import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { PostgresCustomerProfileRepository } from "../customer/customer-profile.repository.postgres";
import { CustomerProfile } from "../customer/entities";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { EmailModule } from "../email/email.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { BroadcastRepository } from "./broadcast.repository";
import { MongoBroadcastRepository } from "./broadcast.repository.mongo";
import { PostgresBroadcastRepository } from "./broadcast.repository.postgres";
import { BroadcastService } from "./broadcast.service";
import { BroadcastRecipientRepository } from "./broadcast-recipient.repository";
import { MongoBroadcastRecipientRepository } from "./broadcast-recipient.repository.mongo";
import { PostgresBroadcastRecipientRepository } from "./broadcast-recipient.repository.postgres";
import { ConversationRepository } from "./conversation.repository";
import { MongoConversationRepository } from "./conversation.repository.mongo";
import { PostgresConversationRepository } from "./conversation.repository.postgres";
import { ConversationParticipantRepository } from "./conversation-participant.repository";
import { MongoConversationParticipantRepository } from "./conversation-participant.repository.mongo";
import { PostgresConversationParticipantRepository } from "./conversation-participant.repository.postgres";
import { ConversationResponseMetricRepository } from "./conversation-response-metric.repository";
import { MongoConversationResponseMetricRepository } from "./conversation-response-metric.repository.mongo";
import { PostgresConversationResponseMetricRepository } from "./conversation-response-metric.repository.postgres";
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
import { MessageRepository } from "./message.repository";
import { MongoMessageRepository } from "./message.repository.mongo";
import { PostgresMessageRepository } from "./message.repository.postgres";
import { MessageAttachmentRepository } from "./message-attachment.repository";
import { MongoMessageAttachmentRepository } from "./message-attachment.repository.mongo";
import { PostgresMessageAttachmentRepository } from "./message-attachment.repository.postgres";
import { MessageNotificationService } from "./message-notification.service";
import { MessageReadReceiptRepository } from "./message-read-receipt.repository";
import { MongoMessageReadReceiptRepository } from "./message-read-receipt.repository.mongo";
import { PostgresMessageReadReceiptRepository } from "./message-read-receipt.repository.postgres";
import { MessagingService } from "./messaging.service";
import { ResponseMetricsService } from "./response-metrics.service";
import { BroadcastSchema } from "./schemas/broadcast.schema";
import { BroadcastRecipientSchema } from "./schemas/broadcast-recipient.schema";
import { ConversationSchema } from "./schemas/conversation.schema";
import { ConversationParticipantSchema } from "./schemas/conversation-participant.schema";
import { ConversationResponseMetricSchema } from "./schemas/conversation-response-metric.schema";
import { MessageSchema } from "./schemas/message.schema";
import { MessageAttachmentSchema } from "./schemas/message-attachment.schema";
import { MessageReadReceiptSchema } from "./schemas/message-read-receipt.schema";
import { SlaConfigSchema } from "./schemas/sla-config.schema";
import { SlaConfigRepository } from "./sla-config.repository";
import { MongoSlaConfigRepository } from "./sla-config.repository.mongo";
import { PostgresSlaConfigRepository } from "./sla-config.repository.postgres";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Conversation", schema: ConversationSchema },
            { name: "ConversationParticipant", schema: ConversationParticipantSchema },
            { name: "Message", schema: MessageSchema },
            { name: "MessageAttachment", schema: MessageAttachmentSchema },
            { name: "MessageReadReceipt", schema: MessageReadReceiptSchema },
            { name: "ConversationResponseMetric", schema: ConversationResponseMetricSchema },
            { name: "Broadcast", schema: BroadcastSchema },
            { name: "BroadcastRecipient", schema: BroadcastRecipientSchema },
            { name: "SlaConfig", schema: SlaConfigSchema },
            { name: "User", schema: UserSchema },
            { name: "CustomerProfile", schema: CustomerProfileSchema },
            { name: "SupplierProfile", schema: SupplierProfileSchema },
            { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
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
            SupplierOnboarding,
          ]),
        ]),
    ConfigModule,
    EmailModule,
  ],
  providers: [
    MessagingService,
    ResponseMetricsService,
    BroadcastService,
    MessageNotificationService,
    repositoryProvider(
      ConversationRepository,
      PostgresConversationRepository,
      MongoConversationRepository,
    ),
    repositoryProvider(
      ConversationParticipantRepository,
      PostgresConversationParticipantRepository,
      MongoConversationParticipantRepository,
    ),
    repositoryProvider(MessageRepository, PostgresMessageRepository, MongoMessageRepository),
    repositoryProvider(
      MessageAttachmentRepository,
      PostgresMessageAttachmentRepository,
      MongoMessageAttachmentRepository,
    ),
    repositoryProvider(
      MessageReadReceiptRepository,
      PostgresMessageReadReceiptRepository,
      MongoMessageReadReceiptRepository,
    ),
    repositoryProvider(
      ConversationResponseMetricRepository,
      PostgresConversationResponseMetricRepository,
      MongoConversationResponseMetricRepository,
    ),
    repositoryProvider(BroadcastRepository, PostgresBroadcastRepository, MongoBroadcastRepository),
    repositoryProvider(
      BroadcastRecipientRepository,
      PostgresBroadcastRecipientRepository,
      MongoBroadcastRecipientRepository,
    ),
    repositoryProvider(SlaConfigRepository, PostgresSlaConfigRepository, MongoSlaConfigRepository),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      CustomerProfileRepository,
      PostgresCustomerProfileRepository,
      MongoCustomerProfileRepository,
    ),
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
  ],
  exports: [MessagingService, ResponseMetricsService, BroadcastService, MessageNotificationService],
})
export class MessagingModule {}
