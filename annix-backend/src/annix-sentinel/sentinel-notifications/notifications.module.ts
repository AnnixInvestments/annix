import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { User } from "../../user/entities/user.entity";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelNotification } from "./entities/notification.entity";
import { AnnixSentinelNotificationPreferences } from "./entities/notification-preferences.entity";
import { AnnixSentinelNotificationRepository } from "./notification.repository";
import { MongoAnnixSentinelNotificationRepository } from "./notification.repository.mongo";
import { PostgresAnnixSentinelNotificationRepository } from "./notification.repository.postgres";
import { AnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository";
import { MongoAnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository.mongo";
import { PostgresAnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository.postgres";
import { AnnixSentinelNotificationsController } from "./notifications.controller";
import { AnnixSentinelNotificationsService } from "./notifications.service";
import { AnnixSentinelNotificationSchema } from "./schemas/notification.schema";
import { AnnixSentinelNotificationPreferencesSchema } from "./schemas/notification-preferences.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnnixSentinelNotification", schema: AnnixSentinelNotificationSchema },
            {
              name: "AnnixSentinelNotificationPreferences",
              schema: AnnixSentinelNotificationPreferencesSchema,
            },
          ]),
          TypeOrmModule.forFeature([User]),
        ]
      : [
          TypeOrmModule.forFeature([
            AnnixSentinelNotification,
            AnnixSentinelNotificationPreferences,
            User,
          ]),
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
      PostgresAnnixSentinelNotificationRepository,
      MongoAnnixSentinelNotificationRepository,
    ),
    repositoryProvider(
      AnnixSentinelNotificationPreferencesRepository,
      PostgresAnnixSentinelNotificationPreferencesRepository,
      MongoAnnixSentinelNotificationPreferencesRepository,
    ),
  ],
})
export class AnnixSentinelNotificationsModule {}
