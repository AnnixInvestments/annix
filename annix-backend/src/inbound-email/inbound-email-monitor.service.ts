import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as Imap from "imap-simple";
import { simpleParser } from "mailparser";
import { nowMillis } from "../lib/datetime";
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

@Injectable()
export class InboundEmailMonitorService {
  private readonly logger = new Logger(InboundEmailMonitorService.name);
  private isPolling = false;

  constructor(
    private readonly inboundEmailService: InboundEmailService,
    private readonly registry: InboundEmailRegistry,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Cron("0 */6 * * *", { name: "inbound-email:poll-all" })
  async pollAllConfigs(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      const configs = await this.inboundEmailService.enabledConfigs();

      if (configs.length === 0) {
        return;
      }

      for (const config of configs) {
        if (!this.registry.isRegistered(config.app)) {
          this.logger.warn(
            `No handler registered for app "${config.app}", skipping config ${config.id}`,
          );
          continue;
        }

        try {
          await this.pollConfig(config);
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
  }

  private async pollConfig(config: InboundEmailConfig): Promise<void> {
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

      const messages = await connection.search(["UNSEEN"], {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: true,
      });

      this.logger.log(
        `[${config.app}] Found ${messages.length} unread emails for company ${config.companyId}`,
      );

      for (const message of messages) {
        await this.processMessage(config, message);
      }
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  private async processMessage(config: InboundEmailConfig, message: Imap.Message): Promise<void> {
    try {
      const all = message.parts.find((part) => part.which === "");
      if (!all) return;

      const parsed = await simpleParser(all.body);
      const messageId = parsed.messageId || `${nowMillis()}-${Math.random()}`;

      const alreadyExists = await this.inboundEmailService.emailExists(messageId);
      if (alreadyExists) {
        this.logger.debug(`[${config.app}] Skipping duplicate message: ${messageId}`);
        return;
      }

      const fromValue = parsed.from?.value;
      const fromEmail = Array.isArray(fromValue) ? fromValue[0]?.address || "" : "";
      const fromName = Array.isArray(fromValue) ? fromValue[0]?.name || null : null;
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
        return;
      }

      const classifier = this.registry.classifierForApp(config.app);
      let allSucceeded = true;
      let anySucceeded = false;

      for (const att of eligibleAttachments) {
        try {
          const filename = att.filename || "attachment";

          let classification = classifier?.classifyFromSubject(subject, filename) ?? null;

          if (!classification || classification.documentType === "unknown") {
            if (classifier) {
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
            }
          }

          const storagePrefix = `${config.app}/inbound/${resolvedCompanyId ?? "shared"}`;
          const multerFile: Express.Multer.File = {
            fieldname: "file",
            originalname: filename,
            encoding: "7bit",
            mimetype: att.contentType,
            size: att.size,
            buffer: att.content,
            stream: null as never,
            destination: "",
            filename: "",
            path: "",
          };

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
              );

              await this.inboundEmailService.updateAttachment(attachment.id, {
                linkedEntityType: routingResult.linkedEntityType,
                linkedEntityId: routingResult.linkedEntityId,
                extractionStatus: routingResult.extractionTriggered
                  ? attachment.extractionStatus
                  : ("skipped" as InboundEmailAttachment["extractionStatus"]),
              });

              anySucceeded = true;
            } catch (routeError) {
              const msg = routeError instanceof Error ? routeError.message : String(routeError);
              this.logger.error(`[${config.app}] Failed to route attachment ${filename}: ${msg}`);
              await this.inboundEmailService.updateAttachment(attachment.id, {
                errorMessage: msg,
                extractionStatus: "failed" as InboundEmailAttachment["extractionStatus"],
              });
              allSucceeded = false;
            }
          } else {
            anySucceeded = true;
          }
        } catch (attError) {
          const msg = attError instanceof Error ? attError.message : String(attError);
          this.logger.error(`[${config.app}] Failed to process attachment: ${msg}`);
          allSucceeded = false;
        }
      }

      const finalStatus = allSucceeded
        ? InboundEmailStatus.COMPLETED
        : anySucceeded
          ? InboundEmailStatus.PARTIAL
          : InboundEmailStatus.FAILED;

      await this.inboundEmailService.updateEmailStatus(email.id, finalStatus);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${config.app}] Failed to process email: ${msg}`);
    }
  }

  private async extractContentForClassification(
    buffer: Buffer,
    mimeType: string,
  ): Promise<string | Buffer> {
    if (mimeType === "application/pdf") {
      try {
        const pdfData = await pdfParse(buffer);
        return pdfData.text || "";
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
