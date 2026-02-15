import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerModule } from "../customer/customer.module";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerFeedback } from "./entities/customer-feedback.entity";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { GithubIssueService } from "./github-issue.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CustomerFeedback, CustomerProfile]),
    CustomerModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService, GithubIssueService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
