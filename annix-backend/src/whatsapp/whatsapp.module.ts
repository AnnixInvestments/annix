import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.mongo";
import { AnnixOrbitProfileSchema } from "../annix-orbit/schemas/annix-orbit-profile.schema";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RbacModule } from "../rbac/rbac.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { AdminWhatsAppController } from "./controllers/admin-whatsapp.controller";
import { WhatsAppConsentController } from "./controllers/whatsapp-consent.controller";
import { WhatsAppConsentAdminController } from "./controllers/whatsapp-consent-admin.controller";
import { WhatsAppWebhookController } from "./controllers/whatsapp-webhook.controller";
import { WhatsAppConversationRepository } from "./repositories/whatsapp-conversation.repository";
import { MongoWhatsAppConversationRepository } from "./repositories/whatsapp-conversation.repository.mongo";
import { WhatsAppMessageRepository } from "./repositories/whatsapp-message.repository";
import { MongoWhatsAppMessageRepository } from "./repositories/whatsapp-message.repository.mongo";
import { WhatsAppConversationSchema } from "./schemas/whatsapp-conversation.schema";
import { WhatsAppMessageSchema } from "./schemas/whatsapp-message.schema";
import { WhatsAppBroadcastService } from "./services/whatsapp-broadcast.service";
import { WhatsAppCloudApiService } from "./services/whatsapp-cloud-api.service";
import { WhatsAppConsentService } from "./services/whatsapp-consent.service";
import { WhatsAppConsentSenderService } from "./services/whatsapp-consent-sender.service";
import { WhatsAppConversationService } from "./services/whatsapp-conversation.service";

@Module({
  imports: [
    ConfigModule,
    AdminModule,
    RbacModule,
    MetricsModule,
    MongooseModule.forFeature([
      { name: "WhatsAppConversation", schema: WhatsAppConversationSchema },
      { name: "WhatsAppMessage", schema: WhatsAppMessageSchema },
      { name: "User", schema: UserSchema },
      { name: "Company", schema: CompanySchema },
    ]),
    MongooseModule.forFeature(
      [{ name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema }],
      ORBIT_CONNECTION,
    ),
  ],
  controllers: [
    WhatsAppWebhookController,
    AdminWhatsAppController,
    WhatsAppConsentController,
    WhatsAppConsentAdminController,
  ],
  providers: [
    WhatsAppCloudApiService,
    WhatsAppConversationService,
    WhatsAppConsentService,
    WhatsAppConsentSenderService,
    WhatsAppBroadcastService,
    repositoryProvider(WhatsAppConversationRepository, MongoWhatsAppConversationRepository),
    repositoryProvider(WhatsAppMessageRepository, MongoWhatsAppMessageRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AnnixOrbitProfileRepository, MongoAnnixOrbitProfileRepository),
  ],
  exports: [WhatsAppCloudApiService, WhatsAppConversationService],
})
export class WhatsAppModule {}
