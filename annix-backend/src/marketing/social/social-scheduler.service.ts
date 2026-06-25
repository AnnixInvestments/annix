import { randomUUID } from "node:crypto";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import type { Model } from "mongoose";
import { fromISO, now } from "../../lib/datetime";
import type { MarketingScheduledSocialPost } from "../schemas/marketing-scheduled-social-post.schema";
import type { SocialPlatform, SocialShareResult } from "./social.types";
import { SocialPublishingService } from "./social-publishing.service";

export interface SocialScheduleItemInput {
  platform: SocialPlatform;
  caption: string;
  scheduledAt: string;
}

export interface SocialNowItemInput {
  platform: SocialPlatform;
  caption: string;
}

export interface ScheduledSocialPostView {
  id: string;
  batchId: string;
  platform: SocialPlatform;
  caption: string;
  imageUrl: string;
  scheduledAt: string | null;
  status: string;
  resultMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  postedAt: string | null;
}

@Injectable()
export class SocialSchedulerService {
  private readonly logger = new Logger(SocialSchedulerService.name);

  constructor(
    @Optional()
    @InjectModel("MarketingScheduledSocialPost")
    private readonly model: Model<MarketingScheduledSocialPost> | null,
    private readonly publishing: SocialPublishingService,
  ) {}

  // Immediate post, one caption per platform. Reuses the publishing service one
  // platform at a time so each gets its own caption (share() applies a single
  // caption across all platforms it's given).
  async postNow(imageUrl: string, items: SocialNowItemInput[]): Promise<SocialShareResult[]> {
    const results: SocialShareResult[] = [];
    for (const item of items) {
      const platformResults = await this.publishing.share([item.platform], item.caption, imageUrl);
      results.push(...platformResults);
    }
    return results;
  }

  async schedule(
    imageUrl: string,
    items: SocialScheduleItemInput[],
    createdBy: string | null,
  ): Promise<ScheduledSocialPostView[]> {
    const model = this.model;
    if (!model) {
      throw new Error("Scheduled social storage is not available.");
    }
    const batchId = randomUUID();
    const createdAt = now().toJSDate();
    const created = await Promise.all(
      items.map((item) =>
        model.create({
          batchId,
          platform: item.platform,
          caption: item.caption,
          imageUrl,
          scheduledAt: fromISO(item.scheduledAt).toJSDate(),
          status: "pending",
          resultMessage: null,
          createdBy: createdBy ?? null,
          createdAt,
          postedAt: null,
        }),
      ),
    );
    return created.map((doc) => this.view(doc.toObject()));
  }

  async list(): Promise<ScheduledSocialPostView[]> {
    if (!this.model) {
      return [];
    }
    const docs = await this.model.find().sort({ scheduledAt: 1, createdAt: -1 }).limit(200).lean();
    return docs.map((doc) => this.view(doc));
  }

  async cancel(id: string): Promise<void> {
    if (!this.model) {
      return;
    }
    await this.model.updateOne({ _id: id, status: "pending" }, { $set: { status: "cancelled" } });
  }

  // Runs every 5 minutes. Off unless SOCIAL_CRON_ENABLED=true so non-prod
  // environments never publish. Mirrors the newsletter dispatcher.
  @Cron("*/5 * * * *")
  async dispatchDue(): Promise<void> {
    if (process.env.SOCIAL_CRON_ENABLED !== "true") {
      return;
    }
    if (!this.model) {
      return;
    }
    const due = await this.model
      .find({ status: "pending", scheduledAt: { $ne: null, $lte: now().toJSDate() } })
      .sort({ scheduledAt: 1 })
      .limit(20)
      .lean();
    for (const doc of due) {
      await this.dispatchOne(String(doc._id));
    }
  }

  private async dispatchOne(id: string): Promise<void> {
    if (!this.model) {
      return;
    }
    // Atomically claim the row so two overlapping cron ticks can't double-post.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: "posting" } },
      { new: true },
    );
    if (!claimed) {
      return;
    }
    try {
      const results = await this.publishing.share(
        [claimed.platform as SocialPlatform],
        claimed.caption,
        claimed.imageUrl,
      );
      const result = results[0];
      claimed.status = result && result.ok ? "posted" : "failed";
      claimed.resultMessage = result ? result.message : "No result returned.";
    } catch (error) {
      claimed.status = "failed";
      claimed.resultMessage =
        error instanceof Error ? error.message : "Scheduled post failed unexpectedly.";
    }
    claimed.postedAt = now().toJSDate();
    await claimed.save();
    this.logger.log(`Scheduled ${claimed.platform} post ${id} → ${claimed.status}`);
  }

  private view(doc: {
    _id: unknown;
    batchId?: string;
    platform: string;
    caption?: string;
    imageUrl?: string;
    scheduledAt?: Date | null;
    status: string;
    resultMessage?: string | null;
    createdBy?: string | null;
    createdAt?: Date;
    postedAt?: Date | null;
  }): ScheduledSocialPostView {
    return {
      id: String(doc._id),
      batchId: doc.batchId ?? "",
      platform: doc.platform as SocialPlatform,
      caption: doc.caption ?? "",
      imageUrl: doc.imageUrl ?? "",
      scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : null,
      status: doc.status,
      resultMessage: doc.resultMessage ?? null,
      createdBy: doc.createdBy ?? null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
      postedAt: doc.postedAt ? new Date(doc.postedAt).toISOString() : null,
    };
  }
}
