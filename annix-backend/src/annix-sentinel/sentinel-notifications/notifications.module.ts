import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { UserSchema } from "../../user/schemas/user.schema";
import { UserRepository } from "../../user/user.repository";
import { MongoUserRepository } from "../../user/user.repository.mongo";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelNotificationRepository } from "./notification.repository";
import { MongoAnnixSentinelNotificationRepository } from "./notification.repository.mongo";
import { AnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository";
import { MongoAnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository.mongo";
import { AnnixSentinelNotificationsController } from "./notifications.controller";
import { AnnixSentinelNotificationsService } from "./notifications.service";
import { AnnixSentinelNotificationSchema } from "./schemas/notification.schema";
import { AnnixSentinelNotificationPreferencesSchema } from "./schemas/notification-preferences.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnnixSentinelNotification", schema: AnnixSentinelNotificationSchema },
      {
        name: "AnnixSentinelNotificationPreferences",
        schema: AnnixSentinelNotificationPreferencesSchema,
      },
      { name: "User", schema: UserSchema },
    ]),
    AnnixSentinelCompaniesModule,
    AnnixSentinelComplianceModule,
    AnnixSentinelDocumentsModule,
  ],
  controllers: [AnnixSentinelNotificationsController],
  providers: [
    AnnixSentinelNotificationsService,
    repositoryProvider(
      AnnixSentinelNotificationRepository,
      MongoAnnixSentinelNotificationRepository,
    ),
    repositoryProvider(
      AnnixSentinelNotificationPreferencesRepository,
      MongoAnnixSentinelNotificationPreferencesRepository,
    ),
    repositoryProvider(UserRepository, MongoUserRepository),
  ],
})
export class AnnixSentinelNotificationsModule {}
