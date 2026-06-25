import {
  MARKETING_LOCALES,
  type MarketingLocale,
  type MarketingSiteContent as MarketingSiteContentTree,
} from "@annix/product-data/marketing";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { MarketingSiteContentService } from "./marketing-site-content.service";
import { MarketingTranslationService } from "./marketing-translation.service";
import type {
  NewsletterCampaignView,
  NewsletterStats,
  NewsletterSubscriberView,
} from "./newsletter.service";
import { NewsletterService } from "./newsletter.service";
import type { LinkedInStatus } from "./social/linkedin-oauth.service";
import { LinkedInOAuthService } from "./social/linkedin-oauth.service";
import type {
  SocialPlatform,
  SocialPlatformStatus,
  SocialShareResult,
} from "./social/social.types";
import { SocialPublishingService } from "./social/social-publishing.service";
import type {
  ScheduledSocialPostView,
  SocialNowItemInput,
  SocialScheduleItemInput,
} from "./social/social-scheduler.service";
import { SocialSchedulerService } from "./social/social-scheduler.service";

interface AuthenticatedRequest {
  user?: { email?: string };
}

interface SocialShareBody {
  platforms: SocialPlatform[];
  caption: string;
  imageUrl: string;
}

interface SocialPostNowBody {
  imageUrl: string;
  items: SocialNowItemInput[];
}

interface SocialScheduleBody {
  imageUrl: string;
  items: SocialScheduleItemInput[];
}

interface SendNewsletterBody {
  subject: string;
  body: string;
}

interface ScheduleNewsletterBody {
  subject: string;
  body: string;
  scheduledAt: string;
}

@ApiTags("Admin Marketing")
@Controller("admin/marketing")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminMarketingController {
  constructor(
    private readonly marketingService: MarketingSiteContentService,
    private readonly translationService: MarketingTranslationService,
    private readonly socialService: SocialPublishingService,
    private readonly socialScheduler: SocialSchedulerService,
    private readonly linkedInOAuth: LinkedInOAuthService,
    private readonly newsletterService: NewsletterService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get("content")
  @ApiOperation({ summary: "Get the editable draft marketing content for a locale" })
  @ApiResponse({ status: 200 })
  async draft(@Query("locale") locale?: string): Promise<MarketingSiteContentTree> {
    return this.marketingService.draftContent(locale);
  }

  @Get("locales")
  @ApiOperation({ summary: "List the locales the marketing site supports" })
  @ApiResponse({ status: 200 })
  locales(): MarketingLocale[] {
    return [...MARKETING_LOCALES];
  }

  @Get("status")
  @ApiOperation({ summary: "Get draft / published status" })
  @ApiResponse({ status: 200 })
  async status() {
    return this.marketingService.status();
  }

  @Post("translate")
  @ApiOperation({
    summary:
      "Auto-translate the English draft into a locale (Gemini) and save it as that locale's draft",
  })
  @ApiResponse({ status: 200 })
  async translate(@Query("locale") locale: string): Promise<MarketingSiteContentTree> {
    return this.translationService.translateDraftInto(locale);
  }

  @Put("content")
  @ApiOperation({ summary: "Save the draft marketing content for a locale" })
  @ApiResponse({ status: 200 })
  async saveDraft(
    @Body() content: MarketingSiteContentTree,
    @Query("locale") locale?: string,
  ): Promise<MarketingSiteContentTree> {
    return this.marketingService.saveDraft(content, locale);
  }

  @Post("publish")
  @ApiOperation({ summary: "Publish the draft to the live site" })
  @ApiResponse({ status: 200 })
  async publish(@Req() req: AuthenticatedRequest): Promise<MarketingSiteContentTree> {
    const publishedBy = req.user?.email ?? null;
    return this.marketingService.publish(publishedBy);
  }

  @Post("discard-draft")
  @ApiOperation({ summary: "Discard the draft, reverting it to the live content" })
  @ApiResponse({ status: 200 })
  async discardDraft(): Promise<MarketingSiteContentTree> {
    return this.marketingService.discardDraft();
  }

  @Get("social/status")
  @ApiOperation({ summary: "Which social platforms are connected for sharing" })
  @ApiResponse({ status: 200 })
  socialStatus(): SocialPlatformStatus[] {
    return this.socialService.status();
  }

  @Post("social/share")
  @ApiOperation({ summary: "Share an image and caption to the selected social platforms" })
  @ApiResponse({ status: 200 })
  async socialShare(@Body() body: SocialShareBody): Promise<SocialShareResult[]> {
    return this.socialService.share(body.platforms, body.caption, body.imageUrl);
  }

  @Post("social/post-now")
  @ApiOperation({
    summary: "Post one image to selected platforms immediately, with a per-platform caption",
  })
  @ApiResponse({ status: 200 })
  async socialPostNow(@Body() body: SocialPostNowBody): Promise<SocialShareResult[]> {
    return this.socialScheduler.postNow(body.imageUrl, body.items);
  }

  @Post("social/schedule")
  @ApiOperation({
    summary: "Schedule one image to selected platforms, each with its own caption and time",
  })
  @ApiResponse({ status: 200 })
  async socialSchedule(
    @Body() body: SocialScheduleBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScheduledSocialPostView[]> {
    return this.socialScheduler.schedule(body.imageUrl, body.items, req.user?.email ?? null);
  }

  @Get("social/scheduled")
  @ApiOperation({ summary: "List scheduled social posts (pending and completed)" })
  @ApiResponse({ status: 200 })
  async socialScheduled(): Promise<ScheduledSocialPostView[]> {
    return this.socialScheduler.list();
  }

  @Post("social/scheduled/:id/cancel")
  @ApiOperation({ summary: "Cancel a pending scheduled social post" })
  @ApiResponse({ status: 200 })
  async socialScheduledCancel(@Param("id") id: string): Promise<{ ok: boolean }> {
    await this.socialScheduler.cancel(id);
    return { ok: true };
  }

  @Get("social/linkedin/status")
  @ApiOperation({ summary: "Whether LinkedIn is connected and how the token is sourced" })
  @ApiResponse({ status: 200 })
  async linkedInStatus(): Promise<LinkedInStatus> {
    return this.linkedInOAuth.status();
  }

  @Get("social/linkedin/connect")
  @ApiOperation({ summary: "Build the LinkedIn OAuth authorize URL to begin connecting" })
  @ApiResponse({ status: 200 })
  linkedInConnect(): { url: string } {
    const state = this.linkedInOAuth.makeState();
    return { url: this.linkedInOAuth.authorizeUrl(state) };
  }

  @Post("social/linkedin/disconnect")
  @ApiOperation({ summary: "Remove the stored LinkedIn OAuth credentials" })
  @ApiResponse({ status: 200 })
  async linkedInDisconnect(): Promise<{ disconnected: true }> {
    await this.linkedInOAuth.disconnect();
    return { disconnected: true };
  }

  @Post("upload-image")
  @ApiOperation({ summary: "Upload an image for the marketing site" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: { type: "object", properties: { file: { type: "string", format: "binary" } } },
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new Error("No file uploaded");
    }
    const result = await this.storageService.upload(file, `${StorageArea.ANNIX_MARKETING}/images`);
    return { url: `/api/public/marketing/asset?key=${encodeURIComponent(result.path)}` };
  }

  @Get("newsletter/subscribers")
  @ApiOperation({ summary: "List marketing newsletter subscribers" })
  async newsletterSubscribers(): Promise<NewsletterSubscriberView[]> {
    return this.newsletterService.listSubscribers();
  }

  @Get("newsletter/stats")
  @ApiOperation({ summary: "Newsletter subscriber statistics" })
  async newsletterStats(): Promise<NewsletterStats> {
    return this.newsletterService.stats();
  }

  @Get("newsletter/campaigns")
  @ApiOperation({ summary: "List newsletter campaigns (sent and scheduled)" })
  async newsletterCampaigns(): Promise<NewsletterCampaignView[]> {
    return this.newsletterService.listCampaigns();
  }

  @Post("newsletter/send")
  @ApiOperation({ summary: "Send a newsletter to all subscribers immediately" })
  async newsletterSend(
    @Body() body: SendNewsletterBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<NewsletterCampaignView> {
    return this.newsletterService.sendNow(body.subject, body.body, req.user?.email ?? null);
  }

  @Post("newsletter/schedule")
  @ApiOperation({ summary: "Schedule a newsletter to send at a later time" })
  async newsletterSchedule(
    @Body() body: ScheduleNewsletterBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<NewsletterCampaignView> {
    return this.newsletterService.schedule(
      body.subject,
      body.body,
      body.scheduledAt,
      req.user?.email ?? null,
    );
  }

  @Post("newsletter/campaigns/:id/cancel")
  @ApiOperation({ summary: "Cancel a pending scheduled newsletter" })
  async newsletterCancel(@Param("id") id: string): Promise<{ ok: boolean }> {
    await this.newsletterService.cancelCampaign(id);
    return { ok: true };
  }
}
