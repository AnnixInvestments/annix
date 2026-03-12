import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaUser } from "../companies/entities/user.entity";
import { ComplySaNotification } from "./entities/notification.entity";
import { ComplySaNotificationPreferences } from "./entities/notification-preferences.entity";
import { ComplySaNotificationsController } from "./notifications.controller";
import { ComplySaNotificationsService } from "./notifications.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplySaNotification,
      ComplySaComplianceStatus,
      ComplySaNotificationPreferences,
      ComplySaUser,
    ]),
  ],
  controllers: [ComplySaNotificationsController],
  providers: [ComplySaNotificationsService],
})
export class ComplySaNotificationsModule {}
