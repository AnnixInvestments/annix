import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitProfile } from "../annix-orbit/entities/annix-orbit-profile.entity";
import { AnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.mongo";
import { PostgresAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.postgres";
import { AnnixOrbitProfileSchema } from "../annix-orbit/schemas/annix-orbit-profile.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { Company } from "../platform/entities/company.entity";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RbacModule } from "../rbac/rbac.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { AdminWhatsAppController } from "./controllers/admin-whatsapp.controller";
import { WhatsAppConsentController } from "./controllers/whatsapp-consent.controller";
import { WhatsAppConsentAdminController } from "./controllers/whatsapp-consent-admin.controller";
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
    ...(isMongoDriver()
      ? [
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
        ]
      : [
          TypeOrmModule.forFeature([
            WhatsAppConversation,
            WhatsAppMessage,
            User,
            Company,
            AnnixOrbitProfile,
          ]),
        ]),
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
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      AnnixOrbitProfileRepository,
      PostgresAnnixOrbitProfileRepository,
      MongoAnnixOrbitProfileRepository,
    ),
  ],
  exports: [WhatsAppCloudApiService, WhatsAppConversationService],
})
export class WhatsAppModule {}
