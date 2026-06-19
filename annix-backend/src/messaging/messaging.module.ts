import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { EmailModule } from "../email/email.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { BroadcastRepository } from "./broadcast.repository";
import { MongoBroadcastRepository } from "./broadcast.repository.mongo";
import { BroadcastService } from "./broadcast.service";
import { BroadcastRecipientRepository } from "./broadcast-recipient.repository";
import { MongoBroadcastRecipientRepository } from "./broadcast-recipient.repository.mongo";
import { ConversationRepository } from "./conversation.repository";
import { MongoConversationRepository } from "./conversation.repository.mongo";
import { ConversationParticipantRepository } from "./conversation-participant.repository";
import { MongoConversationParticipantRepository } from "./conversation-participant.repository.mongo";
import { ConversationResponseMetricRepository } from "./conversation-response-metric.repository";
import { MongoConversationResponseMetricRepository } from "./conversation-response-metric.repository.mongo";
import { MessageRepository } from "./message.repository";
import { MongoMessageRepository } from "./message.repository.mongo";
import { MessageAttachmentRepository } from "./message-attachment.repository";
import { MongoMessageAttachmentRepository } from "./message-attachment.repository.mongo";
import { MessageNotificationService } from "./message-notification.service";
import { MessageReadReceiptRepository } from "./message-read-receipt.repository";
import { MongoMessageReadReceiptRepository } from "./message-read-receipt.repository.mongo";
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

@Module({
  imports: [
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
    ConfigModule,
    EmailModule,
  ],
  providers: [
    MessagingService,
    ResponseMetricsService,
    BroadcastService,
    MessageNotificationService,
    repositoryProvider(ConversationRepository, MongoConversationRepository),
    repositoryProvider(ConversationParticipantRepository, MongoConversationParticipantRepository),
    repositoryProvider(MessageRepository, MongoMessageRepository),
    repositoryProvider(MessageAttachmentRepository, MongoMessageAttachmentRepository),
    repositoryProvider(MessageReadReceiptRepository, MongoMessageReadReceiptRepository),
    repositoryProvider(
      ConversationResponseMetricRepository,
      MongoConversationResponseMetricRepository,
    ),
    repositoryProvider(BroadcastRepository, MongoBroadcastRepository),
    repositoryProvider(BroadcastRecipientRepository, MongoBroadcastRecipientRepository),
    repositoryProvider(SlaConfigRepository, MongoSlaConfigRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(CustomerProfileRepository, MongoCustomerProfileRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
  ],
  exports: [MessagingService, ResponseMetricsService, BroadcastService, MessageNotificationService],
})
export class MessagingModule {}
