import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import * as Imap from "imap-simple";
import { type ParsedMail, simpleParser } from "mailparser";
import { bufferToMulterFile, documentPath } from "../lib/app-storage-helper";
import { now } from "../lib/datetime";
import { extractTextFromPdf } from "../lib/document-extraction";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { InboundEmailStatus } from "./entities/inbound-email.entity";
import { InboundEmailAttachment } from "./entities/inbound-email-attachment.entity";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";
import { InboundEmailService } from "./inbound-email.service";
import { InboundEmailRegistry } from "./inbound-email-registry.service";

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface AiClassificationBudget {
  remaining: number;
  ceilingLogged: boolean;
}

@Injectable()
export class InboundEmailMonitorService {
  private readonly logger = new Logger(InboundEmailMonitorService.name);
  private isPolling = false;

  constructor(
    private readonly inboundEmailService: InboundEmailService,
    private readonly registry: InboundEmailRegistry,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly configService: ConfigService,
  ) {}

  @Cron("0 6-18 * * 1-5", { name: "inbound-email:poll-all" })
  async pollAllConfigs(): Promise<{ processed: number; busy: boolean }> {
    if (this.configService.get<string>("EMAIL_DELIVERY_DISABLED") === "true") {
      this.logger.log("Inbound email polling skipped — email disabled for this environment");
      return { processed: 0, busy: false };
    }

    if (this.isPolling) {
      return { processed: 0, busy: true };
    }

    this.isPolling = true;
    let processed = 0;

    try {
      const configs = await this.inboundEmailService.enabledConfigs();

      if (configs.length === 0) {
        return { processed: 0, busy: false };
      }

      for (const config of configs) {
        if (!this.registry.isRegistered(config.app)) {
          this.logger.warn(
            `No handler registered for app "${config.app}", skipping config ${config.id}`,
          );
          continue;
        }

        try {
          processed += await this.pollConfig(config);
          await this.inboundEmailService.updateLastPoll(config.id, null);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to poll config ${config.id} (${config.app}/${config.companyId}): ${message}`,
          );
          await this.inboundEmailService.updateLastPoll(config.id, message);
        }
      }
    } finally {
      this.isPolling = false;
    }

    return { processed, busy: false };
  }

  private async pollConfig(config: InboundEmailConfig): Promise<number> {
    const password = await this.inboundEmailService.decryptPassword(config);

    const tlsOptions: Record<string, unknown> = {};
    if (config.tlsServerName) {
      tlsOptions.servername = config.tlsServerName;
    }

    const imapConfig: Imap.ImapSimpleOptions = {
      imap: {
        user: config.emailUser,
        password,
        host: config.emailHost,
        port: config.emailPort,
        tls: config.tlsEnabled,
        authTimeout: 10000,
        tlsOptions,
      },
    };

    let connection: Imap.ImapSimple | null = null;

    try {
      connection = await Imap.connect(imapConfig);
      await connection.openBox("INBOX");

      const sinceDate = now().minus({ days: this.pollWindowDays() }).toJSDate();
      const headerMessages = await connection.search([["SINCE", sinceDate]], {
        bodies: ["HEADER"],
        markSeen: false,
      });

      this.logger.log(
        `[${config.app}] Scanned ${headerMessages.length} emails in the last ${this.pollWindowDays()}d window for company ${config.companyId}`,
      );

      let processedCount = 0;
      const maxMessages = this.maxMessagesPerPoll();
      const aiBudget: AiClassificationBudget = {
        remaining: this.maxAiClassificationsPerPoll(),
        ceilingLogged: false,
      };

      for (const headerMessage of headerMessages) {
        if (processedCount >= maxMessages) {
          this.logger.warn(
            `[${config.app}] Reached per-poll cap of ${maxMessages} messages for company ${config.companyId}; remaining unseen mail will be processed on the next poll.`,
          );
          break;
        }

        const messageId = this.messageIdFromHeader(headerMessage);
        if (!messageId) continue;

        const alreadyExists = await this.inboundEmailService.emailExists(messageId);
        if (alreadyExists) continue;

        const uid = headerMessage.attributes?.uid;
        if (!uid) continue;

        const fullMessages = await connection.search([["UID", String(uid)]], {
          bodies: [""],
          markSeen: true,
        });
        const fullMessage = fullMessages[0];
        if (!fullMessage) continue;

        const status = await this.processMessage(config, fullMessage, messageId, aiBudget);
        processedCount += 1;
        if (status === InboundEmailStatus.COMPLETED && this.mailboxIsAutoDeletable(config)) {
          await this.deleteProcessedMessage(connection, config, fullMessage);
        }
      }

      return processedCount;
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  // The poll-window date is intentionally generous (default 7 days) so that
  // emails arriving while polling is suspended (overnight, weekends) are still
  // ingested on the next run. Re-scanned messages are cheaply skipped by the
  // indexed Message-ID dedup, so a wide window costs little.
  private pollWindowDays(): number {
    const raw = this.configService.get<string>("INBOUND_POLL_WINDOW_DAYS");
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  }

  private positiveConfigInt(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private maxMessagesPerPoll(): number {
    return this.positiveConfigInt("INBOUND_MAX_MESSAGES_PER_POLL", 50);
  }

  private maxAiClassificationsPerPoll(): number {
    return this.positiveConfigInt("INBOUND_MAX_AI_CLASSIFICATIONS_PER_POLL", 20);
  }

  private messageIdFromHeader(message: Imap.Message): string | null {
    const headerPart = message.parts.find((part) => part.which === "HEADER");
    if (!headerPart) return null;

    const header = headerPart.body as Record<string, string[] | undefined>;
    const rawId = header["message-id"]?.[0]?.trim();
    if (rawId && rawId.length > 0) return rawId;

    return this.syntheticMessageId(header);
  }

  // Some senders (or forwarders) strip the Message-ID header. A stable hash of
  // the sender, subject and date lets re-scans of the same email dedup
  // deterministically, instead of being re-ingested on every poll.
  private syntheticMessageId(header: Record<string, string[] | undefined>): string {
    const from = header.from?.[0] ?? "";
    const to = header.to?.[0] ?? "";
    const subject = header.subject?.[0] ?? "";
    const date = header.date?.[0] ?? "";
    const hash = createHash("sha256").update(`${from}|${to}|${subject}|${date}`).digest("hex");
    return `synthetic:${hash}`;
  }

  // Resolve the sender robustly. mailparser normally gives a structured address,
  // but some senders/forwarders produce a From header it can't parse into an
  // address — in which case we fall back to the raw From text (extracting the
  // first e-mail-shaped token). An empty result is tolerated by the schema so a
  // quirky header never drops the whole email before routing.
  private extractSender(parsed: ParsedMail): { email: string; name: string | null } {
    const fromValue = parsed.from?.value;
    const first = Array.isArray(fromValue) ? fromValue[0] : undefined;
    const name = first?.name?.trim() || null;

    let email = (first?.address || "").trim();
    if (!email) {
      const rawFrom = (parsed.from?.text || "").trim();
      const match = rawFrom.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/);
      email = match ? match[0].trim() : rawFrom;
      if (email) {
        this.logger.warn(
          `Sender address could not be structured; fell back to raw From "${email}"`,
        );
      } else {
        this.logger.warn("Email has no parseable From address; recording with empty sender");
      }
    }

    return { email, name };
  }

  private async processMessage(
    config: InboundEmailConfig,
    message: Imap.Message,
    messageId: string,
    aiBudget: AiClassificationBudget,
  ): Promise<InboundEmailStatus | null> {
    try {
      const all = message.parts.find((part) => part.which === "");
      if (!all) return null;

      const parsed = await simpleParser(all.body);

      const alreadyExists = await this.inboundEmailService.emailExists(messageId);
      if (alreadyExists) {
        this.logger.debug(`[${config.app}] Skipping duplicate message: ${messageId}`);
        return InboundEmailStatus.COMPLETED;
      }

      const { email: fromEmail, name: fromName } = this.extractSender(parsed);
      const subject = parsed.subject || "";

      const adapter = this.registry.adapterForApp(config.app);
      const router = this.registry.routerForApp(config.app);
      const supportedMimes = router ? new Set(router.supportedMimeTypes()) : SUPPORTED_MIME_TYPES;

      const resolvedCompanyId = adapter
        ? await adapter.resolveCompanyId(fromEmail, config.companyId)
        : config.companyId;

      const eligibleAttachments = (parsed.attachments || []).filter(
        (att) =>
          supportedMimes.has(att.contentType) ||
          this.hasMatchingExtension(att.filename ?? "", supportedMimes),
      );

      const email = await this.inboundEmailService.recordEmail({
        configId: config.id,
        app: config.app,
        companyId: resolvedCompanyId,
        messageId,
        fromEmail,
        fromName,
        subject,
        receivedAt: parsed.date ?? null,
        attachmentCount: eligibleAttachments.length,
      });

      if (eligibleAttachments.length === 0) {
        await this.inboundEmailService.updateEmailStatus(email.id, InboundEmailStatus.COMPLETED);
        return InboundEmailStatus.COMPLETED;
      }

      const classifier = this.registry.classifierForApp(config.app);
      // Track outcomes across attachments so the email's final status reflects
      // whether it actually produced anything, not just that routing didn't
      // throw. "producedEntity" = a CoC/invoice/DN was created and linked;
      // "noOp" = routed (or stored for triage) but produced no record; "error"
      // = routing threw or the attachment failed to process.
      let producedEntity = false;
      let anyNoOp = false;
      let anyError = false;

      for (const att of eligibleAttachments) {
        try {
          const filename = att.filename || "attachment";

          let classification = classifier?.classifyFromSubject(subject, filename) ?? null;

          if (!classification || classification.documentType === "unknown") {
            if (classifier && aiBudget.remaining > 0) {
              aiBudget.remaining -= 1;
              const contentForClassification = await this.extractContentForClassification(
                att.content,
                att.contentType,
              );
              classification = await classifier.classifyFromContent(
                contentForClassification,
                att.contentType,
                filename,
                fromEmail,
                subject,
              );
            } else if (classifier && !aiBudget.ceilingLogged) {
              aiBudget.ceilingLogged = true;
              this.logger.warn(
                `[${config.app}] Per-poll AI classification ceiling reached for company ${config.companyId}; remaining attachments are stored as "unknown" for manual triage.`,
              );
            }
          }

          const storagePrefix = documentPath(config.app, "inbound", resolvedCompanyId ?? "shared");
          const multerFile = bufferToMulterFile(att.content, filename, att.contentType);

          const storageResult = await this.storageService.upload(multerFile, storagePrefix);

          const attachment = await this.inboundEmailService.createAttachment({
            inboundEmailId: email.id,
            originalFilename: filename,
            mimeType: att.contentType,
            fileSizeBytes: att.size,
            s3Path: storageResult.path,
            documentType: classification?.documentType ?? "unknown",
            classificationConfidence: classification?.confidence ?? null,
            classificationSource: classification?.source ?? null,
          });

          if (router && classification?.documentType !== "unknown") {
            try {
              const routingResult = await router.route(
                attachment,
                att.content,
                resolvedCompanyId,
                fromEmail,
                subject,
                classification?.supplierName ?? null,
                { autoIngest: true },
              );

              // Routing can succeed without producing a linked record — e.g. the
              // supplier couldn't be identified, an image CoC the pipeline can't
              // read, or a graph PDF with no parent CoC. Treat that as a no-op
              // needing review, not a success, so it isn't silently completed
              // (and auto-deleted from the mailbox).
              const produced = routingResult.linkedEntityId != null;

              await this.inboundEmailService.updateAttachment(attachment.id, {
                linkedEntityType: routingResult.linkedEntityType,
                linkedEntityId: routingResult.linkedEntityId,
                extractionStatus: routingResult.extractionTriggered
                  ? attachment.extractionStatus
                  : ("skipped" as InboundEmailAttachment["extractionStatus"]),
                ...(produced
                  ? {}
                  : {
                      errorMessage:
                        "Routed but produced no linked record — needs manual review (supplier not identified, unreadable/image document, or unmatched graph)",
                    }),
              });

              if (produced) {
                producedEntity = true;
              } else {
                anyNoOp = true;
                this.logger.warn(
                  `[${config.app}] Attachment ${filename} routed but produced no record — flagged for review`,
                );
              }
            } catch (routeError) {
              const msg = routeError instanceof Error ? routeError.message : String(routeError);
              this.logger.error(`[${config.app}] Failed to route attachment ${filename}: ${msg}`);
              await this.inboundEmailService.updateAttachment(attachment.id, {
                errorMessage: msg,
                extractionStatus: "failed" as InboundEmailAttachment["extractionStatus"],
              });
              anyError = true;
            }
          } else {
            // Unknown document type — stored, but nothing produced. Needs triage.
            anyNoOp = true;
          }
        } catch (attError) {
          const msg = attError instanceof Error ? attError.message : String(attError);
          this.logger.error(`[${config.app}] Failed to process attachment: ${msg}`);
          anyError = true;
        }
      }

      // COMPLETED means "fully handled — at least one record produced and nothing
      // left over"; only that state is safe to auto-delete from the mailbox.
      // Anything that errored or produced nothing is retained and surfaced.
      let finalStatus: InboundEmailStatus;
      if (producedEntity) {
        finalStatus =
          anyError || anyNoOp ? InboundEmailStatus.PARTIAL : InboundEmailStatus.COMPLETED;
      } else if (anyError) {
        finalStatus = InboundEmailStatus.FAILED;
      } else {
        finalStatus = InboundEmailStatus.NEEDS_REVIEW;
      }

      await this.inboundEmailService.updateEmailStatus(email.id, finalStatus);
      return finalStatus;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${config.app}] Failed to process email: ${msg}`);
      return null;
    }
  }

  private mailboxIsAutoDeletable(config: InboundEmailConfig): boolean {
    const ownedDomains = this.autoDeleteDomains();
    if (ownedDomains.length === 0) return false;

    const atIndex = config.emailUser.lastIndexOf("@");
    if (atIndex < 0) return false;

    const domain = config.emailUser.slice(atIndex + 1).toLowerCase();
    return ownedDomains.includes(domain);
  }

  private autoDeleteDomains(): string[] {
    const configured = this.configService.get<string>("INBOUND_AUTO_DELETE_DOMAINS") ?? "";
    return configured
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
  }

  private async deleteProcessedMessage(
    connection: Imap.ImapSimple,
    config: InboundEmailConfig,
    message: Imap.Message,
  ): Promise<void> {
    const uid = message.attributes?.uid;
    if (!uid) return;

    try {
      await connection.deleteMessage(uid);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[${config.app}] Processed but could not delete message uid ${uid} from INBOX: ${msg}`,
      );
    }
  }

  // Re-route attachments whose extraction was skipped (e.g. ingested before an
  // app's router handled that document type). Reads each file back from
  // storage and runs it through the current router.
  async reprocessSkippedAttachments(
    app: string,
  ): Promise<{ reprocessed: number; total: number; details: string[] }> {
    const router = this.registry.routerForApp(app);
    if (!router) {
      return { reprocessed: 0, total: 0, details: [`No router registered for app "${app}"`] };
    }

    const attachments = await this.inboundEmailService.listSkippedAttachments(app);
    const details: string[] = [];
    let reprocessed = 0;

    for (const attachment of attachments) {
      try {
        const email = attachment.inboundEmail;
        const storedPath = attachment.s3Path;
        if (!storedPath) {
          details.push(
            `Attachment ${attachment.id} (${attachment.originalFilename}): no stored file`,
          );
          continue;
        }
        const content = await this.storageService.download(storedPath);
        const routingResult = await router.route(
          attachment,
          content,
          email?.companyId ?? null,
          email?.fromEmail ?? "",
          email?.subject ?? "",
          null,
          { autoIngest: false },
        );
        await this.inboundEmailService.updateAttachment(attachment.id, {
          linkedEntityType: routingResult.linkedEntityType,
          linkedEntityId: routingResult.linkedEntityId,
          extractionStatus: routingResult.extractionTriggered
            ? attachment.extractionStatus
            : ("skipped" as InboundEmailAttachment["extractionStatus"]),
        });
        if (routingResult.extractionTriggered) reprocessed += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        details.push(`Attachment ${attachment.id} (${attachment.originalFilename}): ${msg}`);
        this.logger.error(`[${app}] Reprocess failed for attachment ${attachment.id}: ${msg}`);
      }
    }

    this.logger.log(
      `[${app}] Reprocessed ${reprocessed}/${attachments.length} skipped attachment(s)`,
    );
    return { reprocessed, total: attachments.length, details };
  }

  private async extractContentForClassification(
    buffer: Buffer,
    mimeType: string,
  ): Promise<string | Buffer> {
    if (mimeType === "application/pdf") {
      try {
        return await extractTextFromPdf(buffer);
      } catch {
        return "";
      }
    }

    if (IMAGE_MIME_TYPES.has(mimeType)) {
      return buffer;
    }

    return buffer.toString("utf8").substring(0, 5000);
  }

  private hasMatchingExtension(filename: string, supportedMimes: Set<string>): boolean {
    const lower = filename.toLowerCase();
    const extensionMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
    };

    return Object.entries(extensionMap).some(
      ([ext, mime]) => lower.endsWith(ext) && supportedMimes.has(mime),
    );
  }

  async testConnection(
    app: string,
    companyId: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.inboundEmailService.rawEmailConfig(app, companyId);

      if (!config) {
        return { success: false, error: "No email configuration found for this app/company." };
      }

      const password = await this.inboundEmailService.decryptPassword(config);

      const tlsOptions: Record<string, unknown> = {};
      if (config.tlsServerName) {
        tlsOptions.servername = config.tlsServerName;
      }

      const imapConfig: Imap.ImapSimpleOptions = {
        imap: {
          user: config.emailUser,
          password,
          host: config.emailHost,
          port: config.emailPort,
          tls: config.tlsEnabled,
          authTimeout: 10000,
          tlsOptions,
        },
      };

      const connection = await Imap.connect(imapConfig);
      await connection.openBox("INBOX");
      connection.end();

      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  }
}
