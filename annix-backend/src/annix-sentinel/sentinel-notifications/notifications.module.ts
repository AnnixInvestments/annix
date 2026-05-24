import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../user/entities/user.entity";
import { AnnixSentinelProfile } from "../companies/entities/annix-sentinel-profile.entity";
import { AnnixSentinelComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { AnnixSentinelDocument } from "../sentinel-documents/entities/document.entity";
import { AnnixSentinelNotification } from "./entities/notification.entity";
import { AnnixSentinelNotificationPreferences } from "./entities/notification-preferences.entity";
import { AnnixSentinelNotificationsController } from "./notifications.controller";
import { AnnixSentinelNotificationsService } from "./notifications.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnnixSentinelNotification,
      AnnixSentinelComplianceStatus,
      AnnixSentinelNotificationPreferences,
      AnnixSentinelProfile,
      User,
      AnnixSentinelDocument,
    ]),
  ],
  controllers: [AnnixSentinelNotificationsController],
  providers: [AnnixSentinelNotificationsService],
})
export class AnnixSentinelNotificationsModule {}
