import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import type { Model } from "mongoose";
import { EmailService } from "../email/email.service";
import { emailLayout } from "../email/templates/layout";
import { fromISO, now } from "../lib/datetime";
import type { MarketingNewsletterCampaign } from "./schemas/marketing-newsletter-campaign.schema";
import type { MarketingNewsletterSubscriber } from "./schemas/marketing-newsletter-subscriber.schema";

const BRAND_NAVY = "#0a1733";
const BRAND_ACCENT = "#FF8A00";
const SITE_URL = "https://annix.co.za";

export interface NewsletterSubscriberView {
  id: string;
  email: string;
  status: string;
  source: string | null;
  createdAt: string;
  lastEmailedAt: string | null;
}

export interface NewsletterStats {
  total: number;
  subscribed: number;
  unsubscribed: number;
  today: number;
  thisWeek: number;
}

export interface NewsletterCampaignView {
  id: string;
  subject: string;
  status: string;
  scheduledAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentBy: string | null;
  createdAt: string;
  sentAt: string | null;
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @Optional()
    @InjectModel("MarketingNewsletterSubscriber")
    private readonly subscriberModel: Model<MarketingNewsletterSubscriber> | null,
    @Optional()
    @InjectModel("MarketingNewsletterCampaign")
    private readonly campaignModel: Model<MarketingNewsletterCampaign> | null,
    private readonly emailService: EmailService,
  ) {}

  async subscribe(email: string, source: string | null, userAgent: string | null): Promise<void> {
    if (!this.subscriberModel) {
      return;
    }
    const emailNormalized = normaliseEmail(email);
    const existing = await this.subscriberModel.findOne({ emailNormalized });
    if (existing) {
      if (existing.status !== "subscribed") {
        existing.status = "subscribed";
        existing.unsubscribedAt = null;
        await existing.save();
      }
      return;
    }
    await this.subscriberModel.create({
      email: email.trim(),
      emailNormalized,
      status: "subscribed",
      source: source ?? null,
      userAgent: userAgent ?? null,
      createdAt: now().toJSDate(),
      unsubscribedAt: null,
      lastEmailedAt: null,
    });
  }

  async unsubscribe(email: string): Promise<void> {
    if (!this.subscriberModel) {
      return;
    }
    await this.subscriberModel.updateOne(
      { emailNormalized: normaliseEmail(email) },
      { $set: { status: "unsubscribed", unsubscribedAt: now().toJSDate() } },
    );
  }

  async listSubscribers(): Promise<NewsletterSubscriberView[]> {
    if (!this.subscriberModel) {
      return [];
    }
    const docs = await this.subscriberModel.find().sort({ createdAt: -1 }).limit(5000).lean();
    return docs.map((doc) => ({
      id: String(doc._id),
      email: doc.email,
      status: doc.status,
      source: doc.source ?? null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
      lastEmailedAt: doc.lastEmailedAt ? new Date(doc.lastEmailedAt).toISOString() : null,
    }));
  }

  async stats(): Promise<NewsletterStats> {
    if (!this.subscriberModel) {
      return { total: 0, subscribed: 0, unsubscribed: 0, today: 0, thisWeek: 0 };
    }
    const startOfToday = now().startOf("day").toJSDate();
    const startOfWeek = now().minus({ days: 7 }).toJSDate();
    const total = await this.subscriberModel.countDocuments();
    const subscribed = await this.subscriberModel.countDocuments({ status: "subscribed" });
    const unsubscribed = await this.subscriberModel.countDocuments({ status: "unsubscribed" });
    const today = await this.subscriberModel.countDocuments({ createdAt: { $gte: startOfToday } });
    const thisWeek = await this.subscriberModel.countDocuments({
      createdAt: { $gte: startOfWeek },
    });
    return { total, subscribed, unsubscribed, today, thisWeek };
  }

  async sendNow(
    subject: string,
    body: string,
    sentBy: string | null,
  ): Promise<NewsletterCampaignView> {
    const campaign = await this.createCampaign(subject, body, null, sentBy);
    return this.dispatchCampaign(campaign.id);
  }

  async schedule(
    subject: string,
    body: string,
    scheduledAtIso: string,
    sentBy: string | null,
  ): Promise<NewsletterCampaignView> {
    const campaign = await this.createCampaign(subject, body, scheduledAtIso, sentBy);
    return campaign;
  }

  async listCampaigns(): Promise<NewsletterCampaignView[]> {
    if (!this.campaignModel) {
      return [];
    }
    const docs = await this.campaignModel.find().sort({ createdAt: -1 }).limit(200).lean();
    return docs.map((doc) => this.campaignView(doc));
  }

  async cancelCampaign(id: string): Promise<void> {
    if (!this.campaignModel) {
      return;
    }
    await this.campaignModel.updateOne(
      { _id: id, status: "pending" },
      { $set: { status: "cancelled" } },
    );
  }

  @Cron("0 * * * *")
  async dispatchDue(): Promise<void> {
    if (process.env.NEWSLETTER_CRON_ENABLED !== "true") {
      return;
    }
    if (!this.campaignModel) {
      return;
    }
    const due = await this.campaignModel
      .find({ status: "pending", scheduledAt: { $ne: null, $lte: now().toJSDate() } })
      .limit(10)
      .lean();
    for (const doc of due) {
      await this.dispatchCampaign(String(doc._id));
    }
  }

  private async createCampaign(
    subject: string,
    body: string,
    scheduledAtIso: string | null,
    sentBy: string | null,
  ): Promise<NewsletterCampaignView> {
    if (!this.campaignModel) {
      throw new Error("Newsletter storage is not available.");
    }
    const created = await this.campaignModel.create({
      subject: subject.trim(),
      body,
      scheduledAt: scheduledAtIso ? fromISO(scheduledAtIso).toJSDate() : null,
      status: "pending",
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      sentBy: sentBy ?? null,
      createdAt: now().toJSDate(),
      sentAt: null,
    });
    return this.campaignView(created.toObject());
  }

  private async dispatchCampaign(id: string): Promise<NewsletterCampaignView> {
    if (!this.campaignModel || !this.subscriberModel) {
      throw new Error("Newsletter storage is not available.");
    }
    const campaign = await this.campaignModel.findById(id);
    if (!campaign || campaign.status === "cancelled" || campaign.status === "sent") {
      throw new Error("Campaign is not dispatchable.");
    }
    const recipients = await this.subscriberModel.find({ status: "subscribed" }).lean();
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      const ok = await this.sendOne(recipient.email, campaign.subject, campaign.body);
      if (ok) {
        sent += 1;
      } else {
        failed += 1;
      }
    }
    await this.subscriberModel.updateMany(
      { status: "subscribed" },
      { $set: { lastEmailedAt: now().toJSDate() } },
    );
    campaign.status = failed > 0 && sent === 0 ? "failed" : "sent";
    campaign.recipientCount = recipients.length;
    campaign.sentCount = sent;
    campaign.failedCount = failed;
    campaign.sentAt = now().toJSDate();
    await campaign.save();
    this.logger.log(
      `Newsletter "${campaign.subject}" dispatched: ${sent} sent, ${failed} failed (${recipients.length} recipients).`,
    );
    return this.campaignView(campaign.toObject());
  }

  private async sendOne(email: string, subject: string, body: string): Promise<boolean> {
    const unsubscribeUrl = `${SITE_URL}/api/public/marketing/newsletter-unsubscribe?email=${encodeURIComponent(email)}`;
    const footerHtml = `<p style="color:#999;font-size:12px;">You are receiving this because you subscribed to Annix updates. <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`;
    const html = emailLayout({
      title: subject,
      heading: subject,
      headingColor: BRAND_NAVY,
      bodyHtml: `${bodyToHtml(body)}${footerHtml}`,
      footerText: "Annix Investments — annix.co.za",
    });
    try {
      return await this.emailService.sendEmail({
        to: email,
        subject,
        html,
        isTransactional: false,
        fromName: "Annix",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Newsletter send to ${email} failed: ${message}`);
      return false;
    }
  }

  private campaignView(doc: {
    _id: unknown;
    subject: string;
    status: string;
    scheduledAt?: Date | null;
    recipientCount?: number;
    sentCount?: number;
    failedCount?: number;
    sentBy?: string | null;
    createdAt?: Date;
    sentAt?: Date | null;
  }): NewsletterCampaignView {
    return {
      id: String(doc._id),
      subject: doc.subject,
      status: doc.status,
      scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : null,
      recipientCount: doc.recipientCount ?? 0,
      sentCount: doc.sentCount ?? 0,
      failedCount: doc.failedCount ?? 0,
      sentBy: doc.sentBy ?? null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
      sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
    };
  }
}
