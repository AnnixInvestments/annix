import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AdminWhatsAppController } from "./controllers/admin-whatsapp.controller";
import { WhatsAppWebhookController } from "./controllers/whatsapp-webhook.controller";
import { WhatsAppConversation } from "./entities/whatsapp-conversation.entity";
import { WhatsAppMessage } from "./entities/whatsapp-message.entity";
import { WhatsAppConversationRepository } from "./repositories/whatsapp-conversation.repository";
import { MongoWhatsAppConversationRepository } from "./repositories/whatsapp-conversation.repository.mongo";
import { PostgresWhatsAppConversationRepository } from "./repositories/whatsapp-conversation.repository.postgres";
import { WhatsAppMessageRepository } from "./repositories/whatsapp-message.repository";
import { MongoWhatsAppMessageRepository } from "./repositories/whatsapp-message.repository.mongo";
import { PostgresWhatsAppMessageRepository } from "./repositories/whatsapp-message.repository.postgres";
import { WhatsAppConversationSchema } from "./schemas/whatsapp-conversation.schema";
import { WhatsAppMessageSchema } from "./schemas/whatsapp-message.schema";
import { WhatsAppCloudApiService } from "./services/whatsapp-cloud-api.service";
import { WhatsAppConversationService } from "./services/whatsapp-conversation.service";

@Module({
  imports: [
    ConfigModule,
    AdminModule,
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "WhatsAppConversation", schema: WhatsAppConversationSchema },
            { name: "WhatsAppMessage", schema: WhatsAppMessageSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([WhatsAppConversation, WhatsAppMessage])]),
  ],
  controllers: [WhatsAppWebhookController, AdminWhatsAppController],
  providers: [
    WhatsAppCloudApiService,
    WhatsAppConversationService,
    repositoryProvider(
      WhatsAppConversationRepository,
      PostgresWhatsAppConversationRepository,
      MongoWhatsAppConversationRepository,
    ),
    repositoryProvider(
      WhatsAppMessageRepository,
      PostgresWhatsAppMessageRepository,
      MongoWhatsAppMessageRepository,
    ),
  ],
  exports: [WhatsAppCloudApiService, WhatsAppConversationService],
})
export class WhatsAppModule {}
