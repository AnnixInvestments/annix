import { Injectable, Logger } from "@nestjs/common";
import type { ISocialAdapter, SocialPlatform, SocialShareInput } from "../social.types";

const GRAPH_VERSION = "v19.0";

@Injectable()
export class FacebookAdapter implements ISocialAdapter {
  readonly platform: SocialPlatform = "facebook";
  readonly label = "Facebook Page";
  private readonly logger = new Logger(FacebookAdapter.name);

  private pageId(): string {
    return process.env.FACEBOOK_PAGE_ID ?? "";
  }

  private token(): string {
    return process.env.META_PAGE_ACCESS_TOKEN ?? "";
  }

  isConfigured(): boolean {
    return this.pageId().length > 0 && this.token().length > 0;
  }

  async share(input: SocialShareInput): Promise<void> {
    const params = new URLSearchParams({
      url: input.imageUrl,
      caption: input.caption,
      access_token: this.token(),
    });
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${this.pageId()}/photos`,
      { method: "POST", body: params },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`Facebook post failed: ${response.status} ${detail}`);
      throw new Error("Facebook rejected the post — check the page token and permissions.");
    }
  }
}
