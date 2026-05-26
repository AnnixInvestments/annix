import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerModule } from "../customer/customer.module";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { PostgresCustomerProfileRepository } from "../customer/customer-profile.repository.postgres";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { EmailModule } from "../email/email.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MessagingModule } from "../messaging/messaging.module";
import { NixModule } from "../nix/nix.module";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { PostgresStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.postgres";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { CustomerFeedbackRepository } from "./customer-feedback.repository";
import { MongoCustomerFeedbackRepository } from "./customer-feedback.repository.mongo";
import { PostgresCustomerFeedbackRepository } from "./customer-feedback.repository.postgres";
import { CustomerFeedback } from "./entities/customer-feedback.entity";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { FeedbackAttachmentRepository } from "./feedback-attachment.repository";
import { MongoFeedbackAttachmentRepository } from "./feedback-attachment.repository.mongo";
import { PostgresFeedbackAttachmentRepository } from "./feedback-attachment.repository.postgres";
import { FeedbackGithubService } from "./feedback-github.service";
import { FeedbackWebhookController } from "./feedback-webhook.controller";
import { GeneralFeedbackController } from "./general-feedback.controller";
import { FeedbackAuthGuard } from "./guards/feedback-auth.guard";
import { CustomerFeedbackSchema } from "./schemas/customer-feedback.schema";
import { FeedbackAttachmentSchema } from "./schemas/feedback-attachment.schema";

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
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "CustomerFeedback", schema: CustomerFeedbackSchema },
            { name: "FeedbackAttachment", schema: FeedbackAttachmentSchema },
            { name: "CustomerProfile", schema: CustomerProfileSchema },
            { name: "User", schema: UserSchema },
            { name: "StockControlUser", schema: StockControlUserSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            CustomerFeedback,
            FeedbackAttachment,
            CustomerProfile,
            User,
            StockControlUser,
          ]),
        ]),
    CustomerModule,
    EmailModule,
    MessagingModule,
    forwardRef(() => NixModule),
  ],
  controllers: [FeedbackController, GeneralFeedbackController, FeedbackWebhookController],
  providers: [
    FeedbackService,
    FeedbackGithubService,
    FeedbackAuthGuard,
    repositoryProvider(
      CustomerFeedbackRepository,
      PostgresCustomerFeedbackRepository,
      MongoCustomerFeedbackRepository,
    ),
    repositoryProvider(
      FeedbackAttachmentRepository,
      PostgresFeedbackAttachmentRepository,
      MongoFeedbackAttachmentRepository,
    ),
    repositoryProvider(
      CustomerProfileRepository,
      PostgresCustomerProfileRepository,
      MongoCustomerProfileRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      StockControlUserRepository,
      PostgresStockControlUserRepository,
      MongoStockControlUserRepository,
    ),
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
