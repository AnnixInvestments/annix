import { Injectable, Logger } from "@nestjs/common";
import { fromMillis, nowMillis } from "../lib/datetime";
import { LinkedInOAuthService } from "../marketing/social/linkedin-oauth.service";

export interface LinkedInFeedPost {
  id: string;
  text: string;
  imageUrl: string | null;
  permalink: string;
  publishedAtISO: string;
}

interface CachedFeed {
  posts: LinkedInFeedPost[];
  fetchedAtMillis: number;
}

interface LinkedInPostElement {
  id?: string;
  commentary?: string;
  lifecycleState?: string;
  createdAt?: number;
  firstPublishedAt?: number;
  content?: { media?: { id?: string } };
}

interface LinkedInPostsResponse {
  elements?: LinkedInPostElement[];
}

const LINKEDIN_VERSION = "202405";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_POSTS = 10;

@Injectable()
export class LinkedInFeedService {
  private readonly logger = new Logger(LinkedInFeedService.name);
  private cache: CachedFeed | null = null;
  private inFlight: Promise<LinkedInFeedPost[]> | null = null;

  constructor(private readonly oauthService: LinkedInOAuthService) {}

  private orgUrn(): string {
    return process.env.AU_LINKEDIN_ORG_URN ?? "";
  }

  async feed(): Promise<LinkedInFeedPost[]> {
    const orgUrn = this.orgUrn();
    if (orgUrn.length === 0) {
      return [];
    }
    const cached = this.cache;
    if (cached && nowMillis() - cached.fetchedAtMillis < CACHE_TTL_MS) {
      return cached.posts;
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.refresh(orgUrn)
      .then((posts) => {
        this.cache = { posts, fetchedAtMillis: nowMillis() };
        return posts;
      })
      .catch((error) => {
        this.logger.warn(`LinkedIn feed refresh failed: ${String(error)}`);
        return cached?.posts ?? [];
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  private async refresh(orgUrn: string): Promise<LinkedInFeedPost[]> {
    const token = await this.oauthService.validAccessToken();
    if (!token) {
      throw new Error("LinkedIn is not connected.");
    }
    const url = `https://api.linkedin.com/rest/posts?q=author&author=${encodeURIComponent(
      orgUrn,
    )}&count=${MAX_POSTS}&sortBy=LAST_MODIFIED`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`LinkedIn posts fetch failed: ${response.status} ${detail}`);
      throw new Error("LinkedIn rejected the posts request.");
    }
    const body = (await response.json()) as LinkedInPostsResponse;
    const published = (body.elements ?? []).filter(
      (element) => element.lifecycleState === "PUBLISHED",
    );
    const resolved = await Promise.all(published.map((element) => this.toPost(token, element)));
    return resolved.filter((post): post is LinkedInFeedPost => post !== null);
  }

  private async toPost(
    token: string,
    element: LinkedInPostElement,
  ): Promise<LinkedInFeedPost | null> {
    const id = element.id ?? "";
    if (id.length === 0) {
      return null;
    }
    const imageUrn = element.content?.media?.id ?? null;
    const imageUrl = imageUrn ? await this.resolveImage(token, imageUrn) : null;
    const createdAt = element.createdAt ?? element.firstPublishedAt ?? 0;
    const publishedAtISO = createdAt > 0 ? (fromMillis(createdAt).toISO() ?? "") : "";
    return {
      id,
      text: element.commentary ?? "",
      imageUrl,
      permalink: `https://www.linkedin.com/feed/update/${id}`,
      publishedAtISO,
    };
  }

  private async resolveImage(token: string, imageUrn: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.linkedin.com/rest/images/${encodeURIComponent(imageUrn)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "LinkedIn-Version": LINKEDIN_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        },
      );
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { downloadUrl?: string };
      return body.downloadUrl ?? null;
    } catch (error) {
      this.logger.warn(`LinkedIn image resolve failed: ${String(error)}`);
      return null;
    }
  }
}
