import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { StorageModule } from "../storage/storage.module";
import { AdminMarketingController } from "./admin-marketing.controller";
import { CookieConsentService } from "./cookie-consent.service";
import { MarketingSiteContentService } from "./marketing-site-content.service";
import { MarketingTranslationService } from "./marketing-translation.service";
import { NewsletterService } from "./newsletter.service";
import { PublicMarketingController } from "./public-marketing.controller";
import { MarketingSiteContentRepository } from "./repositories/marketing-site-content.repository";
import { MongoMarketingSiteContentRepository } from "./repositories/marketing-site-content.repository.mongo";
import { MarketingCookieConsentSchema } from "./schemas/marketing-cookie-consent.schema";
import { MarketingNewsletterCampaignSchema } from "./schemas/marketing-newsletter-campaign.schema";
import { MarketingNewsletterSubscriberSchema } from "./schemas/marketing-newsletter-subscriber.schema";
import { MarketingSiteContentSchema } from "./schemas/marketing-site-content.schema";
import { FacebookAdapter } from "./social/adapters/facebook.adapter";
import { InstagramAdapter } from "./social/adapters/instagram.adapter";
import { LinkedInAdapter } from "./social/adapters/linkedin.adapter";
import { XAdapter } from "./social/adapters/x.adapter";
import { LinkedInOAuthService } from "./social/linkedin-oauth.service";
import { SocialCredentialRepository } from "./social/repositories/social-credential.repository";
import { MongoSocialCredentialRepository } from "./social/repositories/social-credential.repository.mongo";
import { SocialCredentialSchema } from "./social/schemas/social-credential.schema";
import { SocialPublishingService } from "./social/social-publishing.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "MarketingSiteContent", schema: MarketingSiteContentSchema },
      { name: "MarketingCookieConsent", schema: MarketingCookieConsentSchema },
      {
        name: "MarketingNewsletterSubscriber",
        schema: MarketingNewsletterSubscriberSchema,
      },
      { name: "MarketingNewsletterCampaign", schema: MarketingNewsletterCampaignSchema },
      { name: "SocialCredential", schema: SocialCredentialSchema },
    ]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    StorageModule,
    AdminModule,
    EmailModule,
    MetricsModule,
    NixModule,
  ],
  controllers: [AdminMarketingController, PublicMarketingController],
  providers: [
    MarketingSiteContentService,
    MarketingTranslationService,
    CookieConsentService,
    NewsletterService,
    SocialPublishingService,
    LinkedInOAuthService,
    LinkedInAdapter,
    FacebookAdapter,
    InstagramAdapter,
    XAdapter,
    repositoryProvider(MarketingSiteContentRepository, MongoMarketingSiteContentRepository),
    repositoryProvider(SocialCredentialRepository, MongoSocialCredentialRepository),
  ],
  exports: [MarketingSiteContentService, LinkedInOAuthService],
})
export class MarketingModule {}
