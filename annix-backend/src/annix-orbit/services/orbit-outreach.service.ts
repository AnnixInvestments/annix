import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { EmailAttachment, EmailService } from "../../email/email.service";
import { emailLayout } from "../../email/templates/layout";
import { fromISO, now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { OrbitEarlyAccessSignupRepository } from "../repositories/orbit-early-access-signup.repository";
import { OrbitOutreachAssetRepository } from "../repositories/orbit-outreach-asset.repository";
import { OrbitOutreachScheduleRepository } from "../repositories/orbit-outreach-schedule.repository";

export const OUTREACH_GUIDE_SLOTS = {
  iphone: "iphone-guide",
  android: "android-guide",
  fbw: "fbw-guide",
} as const;

const FIXED_SLOTS: string[] = [
  OUTREACH_GUIDE_SLOTS.iphone,
  OUTREACH_GUIDE_SLOTS.android,
  OUTREACH_GUIDE_SLOTS.fbw,
];

const STORAGE_SUBPATH = "annix-orbit/outreach";

const BRAND_ACCENT = "#FF8A00";
const BRAND_NAVY = "#0A1B3D";
const DEFAULT_REPLY_TO = "admin@annix.co.za";

export type OutreachEnvironment = "prod" | "test";

export interface OutreachRecipient {
  email: string;
  firstName?: string | null;
  device?: string | null;
}

export interface OutreachAssetView {
  id: string;
  slot: string;
  label: string | null;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  url: string;
}

export interface SendOutreachInput {
  subject: string;
  body: string;
  environment: OutreachEnvironment;
  recipients: OutreachRecipient[];
  includeDeviceGuide: boolean;
  includeFbwGuide: boolean;
  extraAssetIds: string[];
  trackEarlyAccess: boolean;
}

export interface SendOutreachResult {
  total: number;
  sent: number;
  failed: number;
  failures: string[];
}

export interface OutreachScheduleView {
  id: string;
  subject: string;
  environment: string;
  recipientCount: number;
  scheduledAt: string;
  status: string;
  sentCount: number;
  failedCount: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyToHtml(body: string): string {
  return escapeHtml(body).replace(/\r?\n/g, "<br>");
}

@Injectable()
export class OrbitOutreachService {
  private readonly logger = new Logger(OrbitOutreachService.name);

  constructor(
    private readonly assetRepo: OrbitOutreachAssetRepository,
    private readonly scheduleRepo: OrbitOutreachScheduleRepository,
    private readonly earlyAccessRepo: OrbitEarlyAccessSignupRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  async listAssets(): Promise<OutreachAssetView[]> {
    const assets = await this.assetRepo.listAll();
    return Promise.all(
      assets.map(async (asset) => ({
        id: String(asset.id),
        slot: asset.slot,
        label: asset.label,
        originalFilename: asset.originalFilename,
        contentType: asset.contentType,
        fileSize: asset.fileSize,
        url: await this.storage.presignedUrl(asset.storagePath, 3600, asset.originalFilename),
      })),
    );
  }

  async uploadAsset(
    slot: string,
    label: string | null,
    file: Express.Multer.File,
  ): Promise<OutreachAssetView> {
    if (!file) {
      throw new BadRequestException("A file is required.");
    }
    const isFixed = FIXED_SLOTS.includes(slot);
    if (!isFixed && slot !== "extra") {
      throw new BadRequestException("Unknown asset slot.");
    }

    const stored = await this.storage.upload(file, STORAGE_SUBPATH);

    if (isFixed) {
      const existing = await this.assetRepo.findBySlot(slot);
      if (existing) {
        await this.safeDeleteStorage(existing.storagePath);
        existing.storagePath = stored.path;
        existing.originalFilename = file.originalname;
        existing.contentType = file.mimetype;
        existing.fileSize = file.size;
        existing.label = label ?? existing.label;
        const saved = await this.assetRepo.save(existing);
        return this.viewFor(saved.id, saved, stored.url);
      }
    }

    const created = await this.assetRepo.create({
      slot,
      label,
      storagePath: stored.path,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
    });
    return this.viewFor(created.id, created, stored.url);
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.assetRepo.findById(id);
    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }
    await this.safeDeleteStorage(asset.storagePath);
    await this.assetRepo.remove(asset);
  }

  async send(input: SendOutreachInput): Promise<SendOutreachResult> {
    const recipients = input.recipients.filter((r) => r.email && r.email.trim() !== "");
    if (recipients.length === 0) {
      throw new BadRequestException("Select at least one recipient.");
    }
    if (!input.subject.trim()) {
      throw new BadRequestException("A subject is required.");
    }

    const link = this.environmentLink(input.environment);

    const iphoneGuide = input.includeDeviceGuide
      ? await this.assetRepo.findBySlot(OUTREACH_GUIDE_SLOTS.iphone)
      : null;
    const androidGuide = input.includeDeviceGuide
      ? await this.assetRepo.findBySlot(OUTREACH_GUIDE_SLOTS.android)
      : null;
    const fbwGuide = input.includeFbwGuide
      ? await this.assetRepo.findBySlot(OUTREACH_GUIDE_SLOTS.fbw)
      : null;

    const extras =
      input.extraAssetIds.length > 0
        ? (await this.assetRepo.listAll()).filter(
            (a) => a.slot === "extra" && input.extraAssetIds.includes(String(a.id)),
          )
        : [];

    const sharedAssets = [fbwGuide, ...extras].filter(
      (a): a is NonNullable<typeof a> => a !== null,
    );
    const sharedAttachments = await this.attachmentsFor(sharedAssets);
    const iphoneAttachment = iphoneGuide ? await this.attachmentsFor([iphoneGuide]) : [];
    const androidAttachment = androidGuide ? await this.attachmentsFor([androidGuide]) : [];

    const failures: string[] = [];
    let sent = 0;

    for (const recipient of recipients) {
      const knownDevice = recipient.device === "iphone" || recipient.device === "android";
      const deviceAttachments =
        !input.includeDeviceGuide || !knownDevice
          ? []
          : recipient.device === "iphone"
            ? iphoneAttachment
            : androidAttachment;

      const guideLinksHtml =
        input.includeDeviceGuide && !knownDevice
          ? await this.unknownDeviceGuideLinks(iphoneGuide, androidGuide)
          : "";

      const html = this.composeHtml(
        input.subject,
        input.body,
        recipient.firstName,
        link,
        guideLinksHtml,
      );

      const ok = await this.emailService.sendEmail({
        to: recipient.email,
        subject: input.subject,
        html,
        isTransactional: false,
        fromName: "Annix Orbit",
        replyTo: this.replyTo(),
        attachments: [...deviceAttachments, ...sharedAttachments],
      });

      if (ok) {
        sent += 1;
        if (input.trackEarlyAccess) {
          await this.markEarlyAccessSent(recipient.email);
        }
      } else {
        failures.push(recipient.email);
      }
    }

    return { total: recipients.length, sent, failed: failures.length, failures };
  }

  async schedule(input: SendOutreachInput, scheduledAtIso: string): Promise<OutreachScheduleView> {
    const recipients = input.recipients.filter((r) => r.email && r.email.trim() !== "");
    if (recipients.length === 0) {
      throw new BadRequestException("Select at least one recipient.");
    }
    if (!input.subject.trim()) {
      throw new BadRequestException("A subject is required.");
    }
    const scheduledAt = fromISO(scheduledAtIso);
    if (!scheduledAt.isValid || scheduledAt.toMillis() <= now().toMillis()) {
      throw new BadRequestException("Choose a date and time in the future.");
    }

    const created = await this.scheduleRepo.create({
      subject: input.subject.trim(),
      body: input.body,
      environment: input.environment,
      recipients: recipients.map((r) => ({
        email: r.email,
        firstName: r.firstName ?? null,
        device: r.device ?? null,
      })),
      includeDeviceGuide: input.includeDeviceGuide,
      includeFbwGuide: input.includeFbwGuide,
      extraAssetIds: input.extraAssetIds,
      trackEarlyAccess: input.trackEarlyAccess,
      scheduledAt: scheduledAt.toJSDate(),
      status: "pending",
      sentCount: 0,
      failedCount: 0,
      failures: [],
      sentAt: null,
    });
    return this.scheduleView(created);
  }

  async listSchedules(): Promise<OutreachScheduleView[]> {
    const schedules = await this.scheduleRepo.listNewestFirst();
    return schedules.map((schedule) => this.scheduleView(schedule));
  }

  async cancelSchedule(id: string): Promise<void> {
    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) {
      throw new NotFoundException("Scheduled send not found.");
    }
    if (schedule.status !== "pending") {
      throw new BadRequestException("Only pending sends can be cancelled.");
    }
    schedule.status = "cancelled";
    await this.scheduleRepo.save(schedule);
  }

  @Cron("*/15 * * * *", { name: "annix-orbit:outreach-dispatch" })
  async processDueSchedules(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) {
      return;
    }
    const due = await this.scheduleRepo.listDuePending(now().toJSDate());
    for (const schedule of due) {
      try {
        const result = await this.send({
          subject: schedule.subject,
          body: schedule.body,
          environment: schedule.environment === "test" ? "test" : "prod",
          recipients: schedule.recipients,
          includeDeviceGuide: schedule.includeDeviceGuide,
          includeFbwGuide: schedule.includeFbwGuide,
          extraAssetIds: schedule.extraAssetIds,
          trackEarlyAccess: schedule.trackEarlyAccess,
        });
        schedule.status = result.failed > 0 && result.sent === 0 ? "failed" : "sent";
        schedule.sentCount = result.sent;
        schedule.failedCount = result.failed;
        schedule.failures = result.failures;
        schedule.sentAt = now().toJSDate();
        await this.scheduleRepo.save(schedule);
      } catch (error) {
        this.logger.error(`Scheduled outreach ${schedule.id} failed: ${String(error)}`);
        schedule.status = "failed";
        await this.scheduleRepo.save(schedule);
      }
    }
  }

  private scheduleView(schedule: {
    id: string;
    subject: string;
    environment: string;
    recipients: unknown[];
    scheduledAt: Date;
    status: string;
    sentCount: number;
    failedCount: number;
  }): OutreachScheduleView {
    const scheduledAt = schedule.scheduledAt;
    return {
      id: String(schedule.id),
      subject: schedule.subject,
      environment: schedule.environment,
      recipientCount: schedule.recipients ? schedule.recipients.length : 0,
      scheduledAt: scheduledAt instanceof Date ? scheduledAt.toISOString() : String(scheduledAt),
      status: schedule.status,
      sentCount: schedule.sentCount,
      failedCount: schedule.failedCount,
    };
  }

  private composeHtml(
    subject: string,
    body: string,
    firstName: string | null | undefined,
    link: string,
    guideLinksHtml: string,
  ): string {
    const greeting =
      firstName && firstName.trim() !== "" ? `<p>Hi ${escapeHtml(firstName)},</p>` : "";
    const bodyHtml = `${greeting}<p>${bodyToHtml(body)}</p>${guideLinksHtml}${this.signatureHtml()}`;
    return emailLayout({
      title: subject,
      heading: subject,
      headingColor: BRAND_NAVY,
      bodyHtml,
      cta: { href: link, label: "Open Annix Orbit", color: BRAND_ACCENT, showLinkFallback: true },
      footerText: "You are receiving this because you joined the Annix Orbit early-access list.",
    });
  }

  private replyTo(): string {
    return (
      this.configService.get<string>("ORBIT_OUTREACH_REPLY_TO") ||
      this.configService.get<string>("SUPPORT_EMAIL") ||
      DEFAULT_REPLY_TO
    );
  }

  private brandAssetBase(): string {
    return (
      this.configService.get<string>("ORBIT_PUBLIC_URL") ||
      this.configService.get<string>("FRONTEND_URL") ||
      "https://orbit.annix.co.za"
    );
  }

  private signatureHtml(): string {
    const base = this.brandAssetBase().replace(/\/$/, "");
    const logoUrl = `${base}/branding/annix-orbit-logo.png`;
    const wordmarkUrl = `${base}/branding/annix-orbit-wordmark.png`;
    const replyTo = this.replyTo();
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;">
            <img src="${logoUrl}" alt="Annix Orbit" height="44" style="display:block;height:44px;width:auto;" />
          </td>
          <td style="vertical-align:middle;">
            <img src="${wordmarkUrl}" alt="Annix Orbit" height="22" style="display:block;height:22px;width:auto;margin-bottom:4px;" />
            <div style="font-family:Arial,sans-serif;font-size:13px;color:${BRAND_NAVY};">
              Questions? Reply to this email or contact
              <a href="mailto:${replyTo}" style="color:${BRAND_ACCENT};text-decoration:none;">${replyTo}</a>.
            </div>
          </td>
        </tr>
      </table>`;
  }

  private async unknownDeviceGuideLinks(
    iphoneGuide: { storagePath: string; originalFilename: string } | null,
    androidGuide: { storagePath: string; originalFilename: string } | null,
  ): Promise<string> {
    const links: string[] = [];
    if (iphoneGuide) {
      const url = await this.storage.presignedUrl(
        iphoneGuide.storagePath,
        7 * 24 * 3600,
        iphoneGuide.originalFilename,
      );
      links.push(`<a href="${url}">iPhone install guide</a>`);
    }
    if (androidGuide) {
      const url = await this.storage.presignedUrl(
        androidGuide.storagePath,
        7 * 24 * 3600,
        androidGuide.originalFilename,
      );
      links.push(`<a href="${url}">Android install guide</a>`);
    }
    if (links.length === 0) {
      return "";
    }
    return `<p>Install guides: ${links.join(" &nbsp;|&nbsp; ")}</p>`;
  }

  private async attachmentsFor(
    assets: Array<{ storagePath: string; originalFilename: string; contentType: string }>,
  ): Promise<EmailAttachment[]> {
    return Promise.all(
      assets.map(async (asset) => ({
        filename: asset.originalFilename,
        content: await this.storage.download(asset.storagePath),
        contentType: asset.contentType,
      })),
    );
  }

  private async markEarlyAccessSent(email: string): Promise<void> {
    try {
      const signup = await this.earlyAccessRepo.findByEmailNormalized(email.trim().toLowerCase());
      if (signup) {
        signup.adminEmailSentAt = now().toJSDate();
        await this.earlyAccessRepo.save(signup);
      }
    } catch (error) {
      this.logger.warn(`Failed to mark admin email sent for ${email}: ${String(error)}`);
    }
  }

  private environmentLink(environment: OutreachEnvironment): string {
    const prod =
      this.configService.get<string>("ORBIT_PROD_URL") ||
      this.configService.get<string>("ORBIT_PUBLIC_URL") ||
      "https://orbit.annix.co.za";
    const test =
      this.configService.get<string>("ORBIT_TEST_URL") ||
      this.configService.get<string>("ORBIT_PUBLIC_URL") ||
      "https://annix-app-test.fly.dev";
    return environment === "test" ? test : prod;
  }

  private viewFor(
    id: string,
    asset: {
      slot: string;
      label: string | null;
      originalFilename: string;
      contentType: string;
      fileSize: number;
    },
    url: string,
  ): OutreachAssetView {
    return {
      id: String(id),
      slot: asset.slot,
      label: asset.label,
      originalFilename: asset.originalFilename,
      contentType: asset.contentType,
      fileSize: asset.fileSize,
      url,
    };
  }

  private async safeDeleteStorage(path: string): Promise<void> {
    try {
      await this.storage.delete(path);
    } catch (error) {
      this.logger.warn(`Failed to delete outreach asset from storage (${path}): ${String(error)}`);
    }
  }
}
