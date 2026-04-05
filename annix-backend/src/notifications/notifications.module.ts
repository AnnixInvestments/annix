import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailModule } from "../email/email.module";
import { EmailChannel } from "./channels/email.channel";
import { SmsChannel } from "./channels/sms.channel";
import { WebPushChannel } from "./channels/web-push.channel";
import { WhatsAppChannel } from "./channels/whatsapp.channel";
import { NotificationDispatcherService } from "./notification-dispatcher.service";

@Global()
@Module({
  imports: [ConfigModule, EmailModule],
  providers: [
    EmailChannel,
    SmsChannel,
    WhatsAppChannel,
    WebPushChannel,
    NotificationDispatcherService,
  ],
  exports: [
    EmailChannel,
    SmsChannel,
    WhatsAppChannel,
    WebPushChannel,
    NotificationDispatcherService,
  ],
})
export class NotificationsModule {}
