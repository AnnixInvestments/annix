import * as fs from "node:fs";
import * as path from "node:path";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import * as Imap from "imap-simple";
import { simpleParser } from "mailparser";
import { Repository } from "typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { RubberCompany } from "./entities/rubber-company.entity";
import { DeliveryNoteType } from "./entities/rubber-delivery-note.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

@Injectable()
export class RubberEmailMonitorService implements OnModuleInit {
  private readonly logger = new Logger(RubberEmailMonitorService.name);
  private readonly uploadDir: string;
  private isMonitoringEnabled = false;

  constructor(
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly cocService: RubberCocService,
    private readonly cocExtractionService: RubberCocExtractionService,
    private readonly deliveryNoteService: RubberDeliveryNoteService,
    private readonly configService: ConfigService,
    private readonly aiChatService: AiChatService,
  ) {
    this.uploadDir = path.join(process.cwd(), "uploads", "rubber-lining");
  }

  onModuleInit() {
    const imapHost = this.configService.get<string>("RUBBER_IMAP_HOST");
    const imapUser = this.configService.get<string>("RUBBER_IMAP_USER");
    const imapPassword = this.configService.get<string>("RUBBER_IMAP_PASSWORD");

    this.isMonitoringEnabled = !!(imapHost && imapUser && imapPassword);

    if (this.isMonitoringEnabled) {
      this.logger.log(
        `Rubber email monitoring enabled for ${imapUser} on ${imapHost}`,
      );
    } else {
      this.logger.log(
        "Rubber email monitoring disabled - RUBBER_IMAP_* environment variables not configured",
      );
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollEmails(): Promise<void> {
    if (!this.isMonitoringEnabled) {
      return;
    }

    try {
      await this.processEmails();
    } catch (error) {
      this.logger.error(`Failed to process rubber emails: ${error.message}`);
    }
  }

  private async processEmails(): Promise<void> {
    const imapHost = this.configService.get<string>("RUBBER_IMAP_HOST")!;
    const imapPort = this.configService.get<number>("RUBBER_IMAP_PORT") || 993;
    const imapUser = this.configService.get<string>("RUBBER_IMAP_USER")!;
    const imapPassword = this.configService.get<string>("RUBBER_IMAP_PASSWORD")!;

    const imapConfig: Imap.ImapSimpleOptions = {
      imap: {
        user: imapUser,
        password: imapPassword,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 10000,
      },
    };

    let connection: Imap.ImapSimple | null = null;

    try {
      connection = await Imap.connect(imapConfig);
      await connection.openBox("INBOX");

      const searchCriteria = ["UNSEEN"];
      const fetchOptions = {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      this.logger.log(`Found ${messages.length} unread emails to process`);

      for (const message of messages) {
        await this.processEmail(message);
      }
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  private async processEmail(message: Imap.Message): Promise<void> {
    try {
      const all = message.parts.find((part) => part.which === "");
      if (!all) return;

      const parsed = await simpleParser(all.body);
      const subject = parsed.subject || "";
      const fromValue = parsed.from?.value;
      const fromEmail = Array.isArray(fromValue)
        ? fromValue[0]?.address || ""
        : "";

      this.logger.log(`Processing email from: ${fromEmail}, subject: ${subject}`);

      const pdfAttachments = (parsed.attachments || []).filter(
        (att) =>
          att.contentType === "application/pdf" ||
          att.filename?.toLowerCase().endsWith(".pdf"),
      );

      if (pdfAttachments.length === 0) {
        this.logger.debug(`No PDF attachments in email: ${subject}`);
        return;
      }

      const documentType = this.determineDocumentType(subject);

      for (const attachment of pdfAttachments) {
        const messageId = parsed.messageId || `${Date.now()}-${Math.random()}`;
        const filename = attachment.filename || "attachment.pdf";

        const pdfText = await this.extractTextFromPdf(attachment.content);

        const supplierInfo = await this.identifySupplierFromDocument(
          pdfText,
          filename,
          fromEmail,
          subject,
        );

        if (!supplierInfo) {
          this.logger.warn(
            `Could not identify supplier for attachment: ${filename}`,
          );
          continue;
        }

        this.logger.log(
          `Identified supplier from document: ${supplierInfo.company.name}, type: ${documentType}`,
        );

        const multerFile: Express.Multer.File = {
          fieldname: "file",
          originalname: filename,
          encoding: "7bit",
          mimetype: attachment.contentType,
          size: attachment.size,
          buffer: attachment.content,
          stream: null as never,
          destination: "",
          filename: "",
          path: "",
        };

        const subPath = `rubber-lining/${documentType}s/${supplierInfo.company.id}`;
        const storageResult = await this.storageService.upload(multerFile, subPath);

        if (documentType === "coc") {
          const coc = await this.cocService.createSupplierCoc(
            {
              cocType: supplierInfo.cocType,
              supplierCompanyId: supplierInfo.company.id,
              documentPath: storageResult.path,
            },
            `imap:${messageId}`,
          );
          this.logger.log(
            `Created Supplier CoC ${coc.id} from email attachment: ${filename}`,
          );

          await this.extractAndLinkCoc(coc.id, supplierInfo.cocType, pdfText);
        } else {
          const dnNumber = `DN-EMAIL-${Date.now()}`;
          const dn = await this.deliveryNoteService.createDeliveryNote(
            {
              deliveryNoteType: supplierInfo.deliveryNoteType,
              supplierCompanyId: supplierInfo.company.id,
              documentPath: storageResult.path,
              deliveryNoteNumber: dnNumber,
            },
            `imap:${messageId}`,
          );
          this.logger.log(
            `Created Delivery Note ${dn.id} from email attachment: ${filename}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process email: ${error.message}`);
    }
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const pdfData = await pdfParse(buffer);
      return pdfData.text || "";
    } catch (error) {
      this.logger.error(`Failed to extract text from PDF: ${error.message}`);
      return "";
    }
  }

  private async identifySupplierFromDocument(
    pdfText: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<{
    company: RubberCompany;
    cocType: SupplierCocType;
    deliveryNoteType: DeliveryNoteType;
  } | null> {
    const companies = await this.companyRepo.find();

    this.logger.log(`PDF text length: ${pdfText.length} characters`);
    this.logger.log(`PDF text preview: ${pdfText.substring(0, 500)}...`);

    const filenameLower = filename.toLowerCase();
    const pdfTextLower = pdfText.toLowerCase();

    if (
      filenameLower.startsWith("imp-") ||
      filenameLower.includes("impilo") ||
      pdfTextLower.includes("impilo industries") ||
      pdfTextLower.includes("impilo rubber")
    ) {
      const impiloCompany = companies.find(
        (c) => c.name.toLowerCase().includes("impilo"),
      );
      if (impiloCompany) {
        this.logger.log(`Identified as Impilo from filename/content pattern: ${impiloCompany.name}`);
        return {
          company: impiloCompany,
          cocType: SupplierCocType.CALENDARER,
          deliveryNoteType: DeliveryNoteType.ROLL,
        };
      }
    }

    const aiResult = await this.identifySupplierWithAi(pdfText, filename, fromEmail, subject);

    if (aiResult) {
      this.logger.log(`AI identified supplier type: ${aiResult.supplierType}`);

      if (aiResult.supplierType === "CALENDARER") {
        const calendarerCompany = companies.find(
          (c) =>
            c.name.toLowerCase().includes("impilo") ||
            c.name.toLowerCase().includes("calendarer"),
        );
        if (calendarerCompany) {
          this.logger.log(`Matched to company: ${calendarerCompany.name}`);
          return {
            company: calendarerCompany,
            cocType: SupplierCocType.CALENDARER,
            deliveryNoteType: DeliveryNoteType.ROLL,
          };
        }
      }

      if (aiResult.supplierType === "COMPOUNDER") {
        const compounderCompany = companies.find(
          (c) =>
            c.name.toLowerCase().includes("s&n") ||
            c.name.toLowerCase().includes("compounder"),
        );
        if (compounderCompany) {
          this.logger.log(`Matched to company: ${compounderCompany.name}`);
          return {
            company: compounderCompany,
            cocType: SupplierCocType.COMPOUNDER,
            deliveryNoteType: DeliveryNoteType.COMPOUND,
          };
        }
      }
    }

    this.logger.warn("AI could not identify supplier, falling back to rule-based matching");
    return this.identifySupplierFallback(pdfText, filename, fromEmail, subject, companies);
  }

  private async identifySupplierWithAi(
    pdfText: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<{ supplierType: "COMPOUNDER" | "CALENDARER"; confidence: number } | null> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for supplier identification");
      return null;
    }

    const truncatedText = pdfText.length > 5000 ? pdfText.substring(0, 5000) : pdfText;

    const systemPrompt = `You are analyzing rubber industry Certificate of Conformance (CoC) documents to identify the supplier type.

There are two types of suppliers:
1. COMPOUNDER - Companies that compound rubber (mix raw materials). Usually S&N Rubber or similar. Their documents typically mention:
   - Batch numbers, compound codes, mixing dates
   - Physical properties like Shore A hardness, specific gravity, tensile strength
   - Rheometer data (S-min, S-max, Ts2, Tc90)
   - Terms like "compound", "batch", "mixing"

2. CALENDARER - Companies that calender rubber into sheets/rolls. Usually Impilo or similar. Their documents typically mention:
   - Roll numbers, sheet specifications
   - Calendering operations, rubber sheets
   - Terms like "calendering", "roll", "sheet", "lining"

Respond ONLY with a JSON object in this exact format:
{"supplierType": "COMPOUNDER" or "CALENDARER", "confidence": 0.0-1.0, "reason": "brief explanation"}`;

    const userMessage = `Analyze this PDF document and identify the supplier type.

Filename: ${filename}
From email: ${fromEmail}
Subject: ${subject}

Document content:
${truncatedText}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      this.logger.log(`AI response for supplier identification: ${response.content}`);

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (
          parsed.supplierType &&
          (parsed.supplierType === "COMPOUNDER" || parsed.supplierType === "CALENDARER")
        ) {
          return {
            supplierType: parsed.supplierType,
            confidence: parsed.confidence || 0.8,
          };
        }
      }

      this.logger.warn("AI response did not contain valid supplier type JSON");
      return null;
    } catch (error) {
      this.logger.error(`AI supplier identification failed: ${error.message}`);
      return null;
    }
  }

  private identifySupplierFallback(
    pdfText: string,
    filename: string,
    fromEmail: string,
    subject: string,
    companies: RubberCompany[],
  ): {
    company: RubberCompany;
    cocType: SupplierCocType;
    deliveryNoteType: DeliveryNoteType;
  } | null {
    const pdfTextLower = pdfText.toLowerCase();
    const filenameLower = filename.toLowerCase();
    const fromEmailLower = fromEmail.toLowerCase();
    const subjectLower = subject.toLowerCase();

    const hasImpiloInDocument =
      pdfTextLower.includes("impilo") ||
      pdfTextLower.includes("calendarer") ||
      pdfTextLower.includes("calendering");

    const hasSnInDocument =
      pdfTextLower.includes("s&n") ||
      pdfTextLower.includes("s & n") ||
      pdfTextLower.includes("sn rubber") ||
      pdfTextLower.includes("compounder");

    if (hasImpiloInDocument && !hasSnInDocument) {
      const calendarerCompany = companies.find(
        (c) =>
          c.name.toLowerCase().includes("impilo") ||
          c.name.toLowerCase().includes("calendarer"),
      );
      if (calendarerCompany) {
        return {
          company: calendarerCompany,
          cocType: SupplierCocType.CALENDARER,
          deliveryNoteType: DeliveryNoteType.ROLL,
        };
      }
    }

    if (hasSnInDocument && !hasImpiloInDocument) {
      const compounderCompany = companies.find(
        (c) =>
          c.name.toLowerCase().includes("s&n") ||
          c.name.toLowerCase().includes("compounder"),
      );
      if (compounderCompany) {
        return {
          company: compounderCompany,
          cocType: SupplierCocType.COMPOUNDER,
          deliveryNoteType: DeliveryNoteType.COMPOUND,
        };
      }
    }

    if (filenameLower.includes("imp-") || filenameLower.includes("impilo")) {
      const calendarerCompany = companies.find(
        (c) =>
          c.name.toLowerCase().includes("impilo") ||
          c.name.toLowerCase().includes("calendarer"),
      );
      if (calendarerCompany) {
        return {
          company: calendarerCompany,
          cocType: SupplierCocType.CALENDARER,
          deliveryNoteType: DeliveryNoteType.ROLL,
        };
      }
    }

    for (const company of companies) {
      const companyNameLower = company.name.toLowerCase();

      if (
        companyNameLower.includes("impilo") ||
        companyNameLower.includes("calendarer")
      ) {
        if (
          fromEmailLower.includes("impilo") ||
          subjectLower.includes("impilo") ||
          subjectLower.includes("calendarer")
        ) {
          return {
            company,
            cocType: SupplierCocType.CALENDARER,
            deliveryNoteType: DeliveryNoteType.ROLL,
          };
        }
      }

      if (
        companyNameLower.includes("s&n") ||
        companyNameLower.includes("compounder")
      ) {
        if (
          fromEmailLower.includes("sandrubber") ||
          fromEmailLower.includes("snrubber") ||
          subjectLower.includes("s&n")
        ) {
          return {
            company,
            cocType: SupplierCocType.COMPOUNDER,
            deliveryNoteType: DeliveryNoteType.COMPOUND,
          };
        }
      }
    }

    return null;
  }

  private async extractAndLinkCoc(
    cocId: number,
    cocType: SupplierCocType,
    pdfText: string,
  ): Promise<void> {
    try {
      const isAvailable = await this.cocExtractionService.isAvailable();
      if (!isAvailable) {
        this.logger.warn("CoC extraction service not available, skipping extraction");
        return;
      }

      this.logger.log(`Extracting data from ${cocType} CoC ${cocId}...`);

      const extractionResult = await this.cocExtractionService.extractByType(cocType, pdfText);

      if (extractionResult.data) {
        await this.cocService.setExtractedData(cocId, extractionResult.data);
        this.logger.log(
          `Extracted data for CoC ${cocId}: ${JSON.stringify(extractionResult.data).substring(0, 200)}...`,
        );

        if (cocType === SupplierCocType.CALENDARER) {
          const linkResult = await this.cocService.linkCalendererToCompounderCocs(cocId);
          if (linkResult.linkedCocIds.length > 0) {
            this.logger.log(
              `Linked CoC ${cocId} to compounder CoCs: ${linkResult.linkedCocIds.join(", ")} via batches: ${linkResult.linkedBatches.join(", ")}`,
            );
          } else {
            this.logger.log(
              `No matching compounder CoCs found for calendarer CoC ${cocId}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to extract/link CoC ${cocId}: ${error.message}`);
    }
  }

  private determineDocumentType(subject: string): "coc" | "delivery_note" {
    const subjectLower = subject.toLowerCase();

    if (
      subjectLower.includes("delivery") ||
      subjectLower.includes(" dn ") ||
      subjectLower.includes("despatch") ||
      subjectLower.includes("dispatch")
    ) {
      return "delivery_note";
    }

    return "coc";
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const imapHost = this.configService.get<string>("RUBBER_IMAP_HOST");
    const imapPort = this.configService.get<number>("RUBBER_IMAP_PORT") || 993;
    const imapUser = this.configService.get<string>("RUBBER_IMAP_USER");
    const imapPassword = this.configService.get<string>("RUBBER_IMAP_PASSWORD");

    if (!imapHost || !imapUser || !imapPassword) {
      return {
        success: false,
        error: "IMAP configuration not set. Please configure RUBBER_IMAP_HOST, RUBBER_IMAP_USER, and RUBBER_IMAP_PASSWORD environment variables.",
      };
    }

    const config: Imap.ImapSimpleOptions = {
      imap: {
        user: imapUser,
        password: imapPassword,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 10000,
      },
    };

    try {
      const connection = await Imap.connect(config);
      await connection.openBox("INBOX");
      connection.end();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
