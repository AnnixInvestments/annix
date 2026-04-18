import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../user/entities/user.entity";
import { ComplySaProfile } from "../companies/entities/comply-sa-profile.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaDocument } from "../comply-documents/entities/document.entity";
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
      ComplySaProfile,
      User,
      ComplySaDocument,
    ]),
  ],
  controllers: [ComplySaNotificationsController],
  providers: [ComplySaNotificationsService],
})
export class ComplySaNotificationsModule {}
