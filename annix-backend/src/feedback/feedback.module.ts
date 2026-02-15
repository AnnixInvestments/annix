import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerModule } from "../customer/customer.module";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { MessagingModule } from "../messaging/messaging.module";
import { User } from "../user/entities/user.entity";
import { UserRole } from "../user-roles/entities/user-role.entity";
import { CustomerFeedback } from "./entities/customer-feedback.entity";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CustomerFeedback, CustomerProfile, User, UserRole]),
    CustomerModule,
    MessagingModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
