import { Injectable, Logger } from "@nestjs/common";
import { nowMillis } from "../../../lib/datetime";
import { type OAuth1Credentials, oauth1Header, oauthNonce } from "../oauth1.util";
import type { ISocialAdapter, SocialPlatform, SocialShareInput } from "../social.types";

const MAX_TWEET_LENGTH = 280;

@Injectable()
export class XAdapter implements ISocialAdapter {
  readonly platform: SocialPlatform = "x";
  readonly label = "X (Twitter)";
  private readonly logger = new Logger(XAdapter.name);

  private credentials(): OAuth1Credentials {
    return {
      consumerKey: process.env.X_API_KEY ?? "",
      consumerSecret: process.env.X_API_SECRET ?? "",
      accessToken: process.env.X_ACCESS_TOKEN ?? "",
      accessSecret: process.env.X_ACCESS_SECRET ?? "",
    };
  }

  isConfigured(): boolean {
    const credentials = this.credentials();
    return (
      credentials.consumerKey.length > 0 &&
      credentials.consumerSecret.length > 0 &&
      credentials.accessToken.length > 0 &&
      credentials.accessSecret.length > 0
    );
  }

  async share(input: SocialShareInput): Promise<void> {
    const mediaId = await this.uploadMedia(input.imageUrl);
    await this.createTweet(input.caption, mediaId);
  }

  private async uploadMedia(imageUrl: string): Promise<string> {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Could not load the image to share.");
    }
    const base64 = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
    const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
    const bodyParams = { media_data: base64 };
    const header = oauth1Header(
      "POST",
      uploadUrl,
      bodyParams,
      this.credentials(),
      oauthNonce(),
      Math.floor(nowMillis() / 1000).toString(),
    );
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: header,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(bodyParams),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`X media upload failed: ${response.status} ${detail}`);
      throw new Error("X rejected the image upload — check the API tier and credentials.");
    }
    const body = (await response.json()) as { media_id_string?: string };
    if (!body.media_id_string) {
      throw new Error("X did not return a media id.");
    }
    return body.media_id_string;
  }

  private async createTweet(caption: string, mediaId: string): Promise<void> {
    const text = caption.length > MAX_TWEET_LENGTH ? caption.slice(0, MAX_TWEET_LENGTH) : caption;
    if (caption.length > MAX_TWEET_LENGTH) {
      this.logger.warn(`X caption truncated to ${MAX_TWEET_LENGTH} characters.`);
    }
    const tweetUrl = "https://api.twitter.com/2/tweets";
    const header = oauth1Header(
      "POST",
      tweetUrl,
      {},
      this.credentials(),
      oauthNonce(),
      Math.floor(nowMillis() / 1000).toString(),
    );
    const response = await fetch(tweetUrl, {
      method: "POST",
      headers: {
        Authorization: header,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`X tweet failed: ${response.status} ${detail}`);
      throw new Error("X rejected the post — check the API tier and credentials.");
    }
  }
}
