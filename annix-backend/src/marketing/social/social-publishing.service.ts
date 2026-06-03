import { Injectable, Logger } from "@nestjs/common";
import { FacebookAdapter } from "./adapters/facebook.adapter";
import { InstagramAdapter } from "./adapters/instagram.adapter";
import { LinkedInAdapter } from "./adapters/linkedin.adapter";
import { XAdapter } from "./adapters/x.adapter";
import type {
  ISocialAdapter,
  SocialPlatform,
  SocialPlatformStatus,
  SocialShareResult,
} from "./social.types";

@Injectable()
export class SocialPublishingService {
  private readonly logger = new Logger(SocialPublishingService.name);
  private readonly adapters: ISocialAdapter[];

  constructor(
    linkedin: LinkedInAdapter,
    facebook: FacebookAdapter,
    instagram: InstagramAdapter,
    x: XAdapter,
  ) {
    this.adapters = [linkedin, facebook, instagram, x];
  }

  status(): SocialPlatformStatus[] {
    return this.adapters.map((adapter) => ({
      platform: adapter.platform,
      label: adapter.label,
      configured: adapter.isConfigured(),
    }));
  }

  private absoluteImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    const base = process.env.SOCIAL_PUBLIC_BASE_URL ?? process.env.FRONTEND_URL ?? "";
    const trimmedBase = base.replace(/\/$/, "");
    const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${trimmedBase}${path}`;
  }

  async share(
    platforms: SocialPlatform[],
    caption: string,
    imageUrl: string,
  ): Promise<SocialShareResult[]> {
    const absoluteImage = this.absoluteImageUrl(imageUrl);
    const targets = this.adapters.filter((adapter) => platforms.includes(adapter.platform));
    return Promise.all(
      targets.map(async (adapter) => {
        if (!adapter.isConfigured()) {
          return {
            platform: adapter.platform,
            ok: false,
            message: `${adapter.label} is not connected yet.`,
          };
        }
        try {
          await adapter.share({ caption, imageUrl: absoluteImage });
          return { platform: adapter.platform, ok: true, message: `Posted to ${adapter.label}.` };
        } catch (error) {
          const message = error instanceof Error ? error.message : `${adapter.label} post failed.`;
          this.logger.warn(`Share to ${adapter.platform} failed: ${message}`);
          return { platform: adapter.platform, ok: false, message };
        }
      }),
    );
  }
}
