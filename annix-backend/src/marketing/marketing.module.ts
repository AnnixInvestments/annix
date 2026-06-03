import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { AdminMarketingController } from "./admin-marketing.controller";
import { CookieConsentService } from "./cookie-consent.service";
import { MarketingSiteContent } from "./entities/marketing-site-content.entity";
import { MarketingSiteContentService } from "./marketing-site-content.service";
import { PublicMarketingController } from "./public-marketing.controller";
import { MarketingSiteContentRepository } from "./repositories/marketing-site-content.repository";
import { MongoMarketingSiteContentRepository } from "./repositories/marketing-site-content.repository.mongo";
import { PostgresMarketingSiteContentRepository } from "./repositories/marketing-site-content.repository.postgres";
import { MarketingCookieConsentSchema } from "./schemas/marketing-cookie-consent.schema";
import { MarketingSiteContentSchema } from "./schemas/marketing-site-content.schema";
import { FacebookAdapter } from "./social/adapters/facebook.adapter";
import { InstagramAdapter } from "./social/adapters/instagram.adapter";
import { LinkedInAdapter } from "./social/adapters/linkedin.adapter";
import { XAdapter } from "./social/adapters/x.adapter";
import { SocialPublishingService } from "./social/social-publishing.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "MarketingSiteContent", schema: MarketingSiteContentSchema },
            { name: "MarketingCookieConsent", schema: MarketingCookieConsentSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([MarketingSiteContent])]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    StorageModule,
    AdminModule,
    EmailModule,
  ],
  controllers: [AdminMarketingController, PublicMarketingController],
  providers: [
    MarketingSiteContentService,
    CookieConsentService,
    SocialPublishingService,
    LinkedInAdapter,
    FacebookAdapter,
    InstagramAdapter,
    XAdapter,
    repositoryProvider(
      MarketingSiteContentRepository,
      PostgresMarketingSiteContentRepository,
      MongoMarketingSiteContentRepository,
    ),
  ],
  exports: [MarketingSiteContentService],
})
export class MarketingModule {}
