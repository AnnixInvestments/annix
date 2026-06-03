export type SocialPlatform = "linkedin" | "facebook" | "instagram" | "x";

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["linkedin", "facebook", "instagram", "x"];

export interface SocialShareInput {
  caption: string;
  imageUrl: string;
}

export interface SocialPlatformStatus {
  platform: SocialPlatform;
  label: string;
  configured: boolean;
}

export interface SocialShareResult {
  platform: SocialPlatform;
  ok: boolean;
  message: string;
}

export interface ISocialAdapter {
  readonly platform: SocialPlatform;
  readonly label: string;
  isConfigured(): boolean;
  share(input: SocialShareInput): Promise<void>;
}
