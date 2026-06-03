import { Injectable, Logger } from "@nestjs/common";
import type { ISocialAdapter, SocialPlatform, SocialShareInput } from "../social.types";

const GRAPH_VERSION = "v19.0";

@Injectable()
export class InstagramAdapter implements ISocialAdapter {
  readonly platform: SocialPlatform = "instagram";
  readonly label = "Instagram";
  private readonly logger = new Logger(InstagramAdapter.name);

  private userId(): string {
    return process.env.INSTAGRAM_USER_ID ?? "";
  }

  private token(): string {
    return process.env.META_PAGE_ACCESS_TOKEN ?? "";
  }

  isConfigured(): boolean {
    return this.userId().length > 0 && this.token().length > 0;
  }

  async share(input: SocialShareInput): Promise<void> {
    const creationId = await this.createContainer(input);
    await this.publishContainer(creationId);
  }

  private async createContainer(input: SocialShareInput): Promise<string> {
    const params = new URLSearchParams({
      image_url: input.imageUrl,
      caption: input.caption,
      access_token: this.token(),
    });
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${this.userId()}/media`,
      { method: "POST", body: params },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`Instagram container failed: ${response.status} ${detail}`);
      throw new Error("Instagram could not stage the image — it must be a public JPEG/PNG URL.");
    }
    const body = (await response.json()) as { id?: string };
    if (!body.id) {
      throw new Error("Instagram did not return a media container.");
    }
    return body.id;
  }

  private async publishContainer(creationId: string): Promise<void> {
    const params = new URLSearchParams({
      creation_id: creationId,
      access_token: this.token(),
    });
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${this.userId()}/media_publish`,
      { method: "POST", body: params },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`Instagram publish failed: ${response.status} ${detail}`);
      throw new Error("Instagram rejected the post — check the account link and permissions.");
    }
  }
}
