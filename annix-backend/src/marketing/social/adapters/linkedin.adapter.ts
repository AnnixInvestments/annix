import { Injectable, Logger } from "@nestjs/common";
import { LinkedInOAuthService } from "../linkedin-oauth.service";
import type { ISocialAdapter, SocialPlatform, SocialShareInput } from "../social.types";

const LINKEDIN_VERSION = "202605";

@Injectable()
export class LinkedInAdapter implements ISocialAdapter {
  readonly platform: SocialPlatform = "linkedin";
  readonly label = "LinkedIn";
  private readonly logger = new Logger(LinkedInAdapter.name);

  constructor(private readonly oauth: LinkedInOAuthService) {}

  private authorUrn(): string {
    return this.oauth.authorUrn();
  }

  isConfigured(): boolean {
    const hasToken = this.oauth.isClientConfigured() || this.oauth.hasEnvToken();
    return hasToken && this.authorUrn().length > 0;
  }

  async share(input: SocialShareInput): Promise<void> {
    const token = await this.oauth.validAccessToken();
    if (!token) {
      throw new Error(
        "LinkedIn is not connected — connect via OAuth or set LINKEDIN_ACCESS_TOKEN.",
      );
    }
    const author = this.authorUrn();
    const imageUrn = await this.uploadImage(token, author, input.imageUrl);
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author,
        commentary: input.caption,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          media: {
            id: imageUrn,
          },
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`LinkedIn post failed: ${response.status} ${detail}`);
      throw new Error("LinkedIn rejected the post — check the page token and permissions.");
    }
  }

  private async uploadImage(token: string, author: string, imageUrl: string): Promise<string> {
    const initResponse = await fetch(
      "https://api.linkedin.com/rest/images?action=initializeUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": LINKEDIN_VERSION,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
      },
    );
    if (!initResponse.ok) {
      const detail = await initResponse.text().catch(() => "");
      this.logger.warn(`LinkedIn upload init failed: ${initResponse.status} ${detail}`);
      throw new Error("LinkedIn would not accept the image upload.");
    }
    const initBody = (await initResponse.json()) as {
      value?: { uploadUrl?: string; image?: string };
    };
    const uploadUrl = initBody.value?.uploadUrl ?? "";
    const imageUrn = initBody.value?.image ?? "";
    if (!uploadUrl || !imageUrn) {
      throw new Error("LinkedIn did not return an upload target for the image.");
    }
    const imageBytes = await this.fetchImage(imageUrl);
    const putResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: new Uint8Array(imageBytes),
    });
    if (!putResponse.ok) {
      throw new Error("Uploading the image to LinkedIn failed.");
    }
    return imageUrn;
  }

  private async fetchImage(imageUrl: string): Promise<Buffer> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Could not load the image to share.");
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
