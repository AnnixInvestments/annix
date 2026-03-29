import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerModule } from "../customer/customer.module";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { EmailModule } from "../email/email.module";
import { MessagingModule } from "../messaging/messaging.module";
import { User } from "../user/entities/user.entity";
import { CustomerFeedback } from "./entities/customer-feedback.entity";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { GeneralFeedbackController } from "./general-feedback.controller";
import { FeedbackAuthGuard } from "./guards/feedback-auth.guard";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
    }),
    TypeOrmModule.forFeature([CustomerFeedback, FeedbackAttachment, CustomerProfile, User]),
    CustomerModule,
    EmailModule,
    MessagingModule,
  ],
  controllers: [FeedbackController, GeneralFeedbackController],
  providers: [FeedbackService, FeedbackAuthGuard],
  exports: [FeedbackService],
})
export class FeedbackModule {}
