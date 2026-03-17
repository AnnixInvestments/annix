import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import * as Imap from "imap-simple";
import { simpleParser } from "mailparser";
import { Repository } from "typeorm";
import { nowMillis } from "../lib/datetime";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { RubberCompany } from "./entities/rubber-company.entity";
import { DeliveryNoteType } from "./entities/rubber-delivery-note.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberTaxInvoiceService } from "./rubber-tax-invoice.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

@Injectable()
export class RubberEmailMonitorService implements OnModuleInit {
  private readonly logger = new Logger(RubberEmailMonitorService.name);
  private isMonitoringEnabled = false;

  constructor(
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly cocService: RubberCocService,
    private readonly cocExtractionService: RubberCocExtractionService,
    private readonly deliveryNoteService: RubberDeliveryNoteService,
    private readonly taxInvoiceService: RubberTaxInvoiceService,
    private readonly configService: ConfigService,
    private readonly aiChatService: AiChatService,
  ) {}

  onModuleInit() {
    const imapHost = this.configService.get<string>("AU_RUBBER_EMAIL_HOST");
    const imapUser = this.configService.get<string>("AU_RUBBER_EMAIL_USER");
    const imapPassword = this.configService.get<string>("AU_RUBBER_EMAIL_PASSWORD");

    this.isMonitoringEnabled = !!(imapHost && imapUser && imapPassword);

    if (this.isMonitoringEnabled) {
      this.logger.log(`AU Rubber email monitoring enabled for ${imapUser} on ${imapHost}`);
    } else {
      this.logger.log(
        "AU Rubber email monitoring disabled - AU_RUBBER_EMAIL_* environment variables not configured",
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: "au-rubber:poll-emails" })
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
    const imapHost = this.configService.get<string>("AU_RUBBER_EMAIL_HOST")!;
    const imapPort = this.configService.get<number>("AU_RUBBER_EMAIL_PORT") || 993;
    const imapUser = this.configService.get<string>("AU_RUBBER_EMAIL_USER")!;
    const imapPassword = this.configService.get<string>("AU_RUBBER_EMAIL_PASSWORD")!;

    const imapConfig: Imap.ImapSimpleOptions = {
      imap: {
        user: imapUser,
        password: imapPassword,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 10000,
        tlsOptions: {
          servername: "da01.ondedicatedhosting.co.za",
        },
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

      await messages.reduce(async (prev, message) => {
        await prev;
        await this.processEmail(message);
      }, Promise.resolve());
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
      const fromEmail = Array.isArray(fromValue) ? fromValue[0]?.address || "" : "";

      this.logger.log(`Processing email from: ${fromEmail}, subject: ${subject}`);

      const pdfAttachments = (parsed.attachments || []).filter(
        (att) =>
          att.contentType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf"),
      );

      if (pdfAttachments.length === 0) {
        this.logger.debug(`No PDF attachments in email: ${subject}`);
        return;
      }

      const storageFolder: Record<string, string> = {
        coc: "cocs",
        delivery_note: "delivery-notes",
        tax_invoice: "tax-invoices",
      };

      await pdfAttachments.reduce(async (prev, attachment) => {
        await prev;
        const messageId = parsed.messageId || `${nowMillis()}-${Math.random()}`;
        const filename = attachment.filename || "attachment.pdf";

        const pdfText = await this.extractTextFromPdf(attachment.content);

        const subjectType = this.determineDocumentType(subject);
        const documentType = this.refineDocumentType(subjectType, pdfText);

        const supplierInfo = await this.identifySupplierFromDocument(
          pdfText,
          filename,
          fromEmail,
          subject,
        );

        if (!supplierInfo) {
          this.logger.warn(`Could not identify supplier for attachment: ${filename}`);
          return;
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

        const subPath = `au-rubber/${storageFolder[documentType]}/${supplierInfo.company.id}`;
        const storageResult = await this.storageService.upload(multerFile, subPath);

        if (documentType === "coc") {
          const extractionResult = await this.extractCocDataFirst(supplierInfo.cocType, pdfText);

          if (extractionResult?.data?.cocNumber) {
            const { coc, wasUpdated } = await this.cocService.upsertByCocNumber(
              extractionResult.data.cocNumber,
              supplierInfo.cocType,
              supplierInfo.company.id,
              storageResult.path,
              extractionResult.data,
              `imap:${messageId}`,
            );

            if (wasUpdated) {
              this.logger.log(
                `Updated existing CoC ${coc.id} (${coc.cocNumber}) from email attachment: ${filename}`,
              );
            } else {
              this.logger.log(
                `Created new CoC ${coc.id} (${coc.cocNumber}) from email attachment: ${filename}`,
              );
            }

            if (supplierInfo.cocType === SupplierCocType.CALENDARER) {
              const linkResult = await this.cocService.linkCalendererToCompounderCocs(coc.id);
              if (linkResult.linkedCocIds.length > 0) {
                this.logger.log(
                  `Linked CoC ${coc.id} to compounder CoCs: ${linkResult.linkedCocIds.join(", ")}`,
                );
              }
            }
          } else {
            const coc = await this.cocService.createSupplierCoc(
              {
                cocType: supplierInfo.cocType,
                supplierCompanyId: supplierInfo.company.id,
                documentPath: storageResult.path,
              },
              `imap:${messageId}`,
            );
            this.logger.log(
              `Created Supplier CoC ${coc.id} (no cocNumber extracted) from email: ${filename}`,
            );

            await this.extractAndLinkCoc(coc.id, supplierInfo.cocType, pdfText);
          }
        } else if (documentType === "tax_invoice") {
          const invoiceNumber =
            this.extractInvoiceNumber(pdfText, subject) || `INV-EMAIL-${nowMillis()}`;
          const invoice = await this.taxInvoiceService.createTaxInvoice(
            {
              invoiceNumber,
              invoiceType: TaxInvoiceType.SUPPLIER,
              companyId: supplierInfo.company.id,
              documentPath: storageResult.path,
            },
            `imap:${messageId}`,
          );
          this.logger.log(
            `Created Tax Invoice ${invoice.id} (${invoice.invoiceNumber}) from email: ${filename}`,
          );
        } else {
          const dnNumber = `DN-EMAIL-${nowMillis()}`;
          const dn = await this.deliveryNoteService.createDeliveryNote(
            {
              deliveryNoteType: supplierInfo.deliveryNoteType,
              supplierCompanyId: supplierInfo.company.id,
              documentPath: storageResult.path,
              deliveryNoteNumber: dnNumber,
            },
            `imap:${messageId}`,
          );
          this.logger.log(`Created Delivery Note ${dn.id} from email attachment: ${filename}`);
        }
      }, Promise.resolve());
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
    documentType?: string;
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
      const impiloCompany = companies.find((c) => c.name.toLowerCase().includes("impilo"));
      if (impiloCompany) {
        this.logger.log(
          `Identified as Impilo from filename/content pattern: ${impiloCompany.name}`,
        );
        return {
          company: impiloCompany,
          cocType: SupplierCocType.CALENDARER,
          deliveryNoteType: DeliveryNoteType.ROLL,
        };
      }
    }

    const aiResult = await this.identifySupplierWithAi(pdfText, filename, fromEmail, subject);

    if (aiResult) {
      this.logger.log(
        `NIX classified document as ${aiResult.documentType}, supplier type: ${aiResult.supplierType}, confidence: ${aiResult.confidence}`,
      );

      if (aiResult.supplierType === "CALENDARER") {
        const calendarerCompany = companies.find(
          (c) =>
            c.name.toLowerCase().includes("impilo") || c.name.toLowerCase().includes("calendarer"),
        );
        if (calendarerCompany) {
          this.logger.log(`Matched to company: ${calendarerCompany.name}`);
          return {
            company: calendarerCompany,
            cocType: SupplierCocType.CALENDARER,
            deliveryNoteType: DeliveryNoteType.ROLL,
            documentType: aiResult.documentType,
          };
        }
      }

      if (aiResult.supplierType === "COMPOUNDER") {
        const compounderCompany = companies.find(
          (c) =>
            c.name.toLowerCase().includes("s&n") || c.name.toLowerCase().includes("compounder"),
        );
        if (compounderCompany) {
          this.logger.log(`Matched to company: ${compounderCompany.name}`);
          return {
            company: compounderCompany,
            cocType: SupplierCocType.COMPOUNDER,
            deliveryNoteType: DeliveryNoteType.COMPOUND,
            documentType: aiResult.documentType,
          };
        }
      }

      if (aiResult.supplierType === "CALENDER_ROLL") {
        const snRubberCompany = companies.find(
          (c) =>
            c.name.toLowerCase().includes("s&n") || c.name.toLowerCase().includes("sn rubber"),
        );
        if (snRubberCompany) {
          this.logger.log(`Matched calender roll CoC to company: ${snRubberCompany.name}`);
          return {
            company: snRubberCompany,
            cocType: SupplierCocType.CALENDER_ROLL,
            deliveryNoteType: DeliveryNoteType.ROLL,
            documentType: aiResult.documentType,
          };
        }
      }

      if (aiResult.documentType === "INVOICE" || aiResult.documentType === "DELIVERY_NOTE") {
        this.logger.log(
          `AI classified as ${aiResult.documentType} - attempting supplier fallback matching`,
        );
        const fallback = this.identifySupplierFallback(
          pdfText,
          filename,
          fromEmail,
          subject,
          companies,
        );
        if (fallback) {
          return { ...fallback, documentType: aiResult.documentType };
        }
      }

      if (aiResult.documentType !== "SUPPLIER_COC" && aiResult.documentType !== "UNKNOWN") {
        this.logger.log(`Document classified as ${aiResult.documentType} - requires manual filing`);
        return null;
      }
    }

    this.logger.warn("NIX could not classify document, falling back to rule-based matching");
    return this.identifySupplierFallback(pdfText, filename, fromEmail, subject, companies);
  }

  private async identifySupplierWithAi(
    pdfText: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<{
    documentType:
      | "SUPPLIER_COC"
      | "DELIVERY_NOTE"
      | "PURCHASE_ORDER"
      | "INVOICE"
      | "QUOTE"
      | "UNKNOWN";
    supplierType: "COMPOUNDER" | "CALENDARER" | "CALENDER_ROLL" | null;
    confidence: number;
  } | null> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for supplier identification");
      return null;
    }

    const truncatedText = pdfText.length > 5000 ? pdfText.substring(0, 5000) : pdfText;

    const systemPrompt = `You are NIX, an AI assistant analyzing documents for AU Industries' rubber lining operations. Your task is to classify incoming documents and identify the supplier.

DOCUMENT TYPES:
1. SUPPLIER_COC - Certificate of Conformance from suppliers
   - COMPOUNDER CoC: From rubber compounding companies (e.g., S&N Rubber). Contains batch numbers, compound codes, mixing dates, Shore A hardness, specific gravity, tensile strength, rheometer data (S-min, S-max, Ts2, Tc90)
   - CALENDARER CoC: From rubber calendering companies (e.g., Impilo Industries). Contains roll numbers, sheet specs, order/ticket numbers, calendering operations
   - CALENDER_ROLL CoC: From S&N Rubber specifically for calendered production rolls. Title is "CERTIFICATE OF CONFORMANCE" with fields: COMPOUND CODE, CALENDER ROLL DESCRIPTION, PRODUCTION DATE OF CALENDER ROLLS, PURCHASE ORDER NUMBER, DELIVERY NOTE. Contains a LABORATORY ANALYSIS DATA table with per-roll Shore A values and shared density/tensile/elongation. Distinct from COMPOUNDER CoCs which have batch-level rheometer data.

2. DELIVERY_NOTE - Goods received documentation
   - Contains delivery date, quantities, item descriptions, supplier details

3. PURCHASE_ORDER - Orders placed by AU Industries
   - Contains PO number, line items, quantities, pricing

4. INVOICE - Supplier invoices for payment
   - Contains invoice number, line items, amounts, payment terms

5. QUOTE - Supplier quotations
   - Contains quoted prices, quantities, validity period

6. UNKNOWN - Cannot confidently classify the document

For SUPPLIER_COC documents, also identify the supplier type (COMPOUNDER, CALENDARER, or CALENDER_ROLL).

Respond ONLY with a JSON object:
{"documentType": "SUPPLIER_COC"|"DELIVERY_NOTE"|"PURCHASE_ORDER"|"INVOICE"|"QUOTE"|"UNKNOWN", "supplierType": "COMPOUNDER"|"CALENDARER"|"CALENDER_ROLL"|null, "confidence": 0.0-1.0, "reason": "brief explanation"}`;

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
        const validDocTypes = [
          "SUPPLIER_COC",
          "DELIVERY_NOTE",
          "PURCHASE_ORDER",
          "INVOICE",
          "QUOTE",
          "UNKNOWN",
        ];
        if (parsed.documentType && validDocTypes.includes(parsed.documentType)) {
          return {
            documentType: parsed.documentType,
            supplierType: parsed.supplierType || null,
            confidence: parsed.confidence || 0.8,
          };
        }
      }

      this.logger.warn("AI response did not contain valid document classification JSON");
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
    documentType?: string;
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
          c.name.toLowerCase().includes("impilo") || c.name.toLowerCase().includes("calendarer"),
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
        (c) => c.name.toLowerCase().includes("s&n") || c.name.toLowerCase().includes("compounder"),
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
          c.name.toLowerCase().includes("impilo") || c.name.toLowerCase().includes("calendarer"),
      );
      if (calendarerCompany) {
        return {
          company: calendarerCompany,
          cocType: SupplierCocType.CALENDARER,
          deliveryNoteType: DeliveryNoteType.ROLL,
        };
      }
    }

    const impiloMatch = companies.find((company) => {
      const companyNameLower = company.name.toLowerCase();
      return (
        (companyNameLower.includes("impilo") || companyNameLower.includes("calendarer")) &&
        (fromEmailLower.includes("impilo") ||
          subjectLower.includes("impilo") ||
          subjectLower.includes("calendarer"))
      );
    });

    if (impiloMatch) {
      return {
        company: impiloMatch,
        cocType: SupplierCocType.CALENDARER,
        deliveryNoteType: DeliveryNoteType.ROLL,
      };
    }

    const snMatch = companies.find((company) => {
      const companyNameLower = company.name.toLowerCase();
      return (
        (companyNameLower.includes("s&n") || companyNameLower.includes("compounder")) &&
        (fromEmailLower.includes("sandrubber") ||
          fromEmailLower.includes("snrubber") ||
          subjectLower.includes("s&n"))
      );
    });

    if (snMatch) {
      return {
        company: snMatch,
        cocType: SupplierCocType.COMPOUNDER,
        deliveryNoteType: DeliveryNoteType.COMPOUND,
      };
    }

    return null;
  }

  private async extractCocDataFirst(
    cocType: SupplierCocType,
    pdfText: string,
  ): Promise<{
    data: import("./entities/rubber-supplier-coc.entity").ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  } | null> {
    try {
      const isAvailable = await this.cocExtractionService.isAvailable();
      if (!isAvailable) {
        this.logger.warn("CoC extraction service not available");
        return null;
      }

      const result = await this.cocExtractionService.extractByType(cocType, pdfText);
      this.logger.log(
        `Pre-extracted ${cocType} CoC data: cocNumber=${result.data.cocNumber || "none"}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to pre-extract CoC data: ${error.message}`);
      return null;
    }
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

        if (extractionResult.data.cocNumber) {
          const mergeResult = await this.cocService.mergeIfDuplicateCocNumber(
            cocId,
            extractionResult.data.cocNumber,
            cocType,
          );
          if (mergeResult.merged) {
            this.logger.log(
              `Merged duplicate CoC ${cocId} into existing CoC ${mergeResult.keptCocId}`,
            );
            return;
          }
        }

        if (cocType === SupplierCocType.CALENDARER) {
          const linkResult = await this.cocService.linkCalendererToCompounderCocs(cocId);
          if (linkResult.linkedCocIds.length > 0) {
            this.logger.log(
              `Linked CoC ${cocId} to compounder CoCs: ${linkResult.linkedCocIds.join(", ")} via batches: ${linkResult.linkedBatches.join(", ")}`,
            );
          } else {
            this.logger.log(`No matching compounder CoCs found for calendarer CoC ${cocId}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to extract/link CoC ${cocId}: ${error.message}`);
    }
  }

  private determineDocumentType(subject: string): "coc" | "delivery_note" | "tax_invoice" {
    const subjectLower = subject.toLowerCase();

    if (subjectLower.includes("invoice") && !subjectLower.includes("proforma")) {
      return "tax_invoice";
    }

    if (subjectLower.includes("tax inv")) {
      return "tax_invoice";
    }

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

  private refineDocumentType(
    subjectType: "coc" | "delivery_note" | "tax_invoice",
    pdfText: string,
  ): "coc" | "delivery_note" | "tax_invoice" {
    const pdfTextUpper = pdfText.toUpperCase();

    if (pdfTextUpper.includes("TAX INVOICE")) {
      return "tax_invoice";
    }

    if (pdfTextUpper.includes("DELIVERY NOTE") || pdfTextUpper.includes("DESPATCH NOTE")) {
      return "delivery_note";
    }

    return subjectType;
  }

  private extractInvoiceNumber(pdfText: string, subject: string): string | null {
    const inPattern = pdfText.match(/\bIN(\d{4,})\b/);
    if (inPattern) {
      return `IN${inPattern[1]}`;
    }

    const invoiceNoPattern = pdfText.match(
      /(?:Invoice|Document)\s*(?:No|Number|#)[:\s]*([A-Za-z0-9-]+)/i,
    );
    if (invoiceNoPattern) {
      return invoiceNoPattern[1];
    }

    const subjectPattern = subject.match(/(?:Invoice|INV)[:\s#-]*([A-Za-z0-9-]+)/i);
    if (subjectPattern) {
      return subjectPattern[1];
    }

    return null;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const imapHost = this.configService.get<string>("AU_RUBBER_EMAIL_HOST");
    const imapPort = this.configService.get<number>("AU_RUBBER_EMAIL_PORT") || 993;
    const imapUser = this.configService.get<string>("AU_RUBBER_EMAIL_USER");
    const imapPassword = this.configService.get<string>("AU_RUBBER_EMAIL_PASSWORD");

    if (!imapHost || !imapUser || !imapPassword) {
      return {
        success: false,
        error:
          "IMAP configuration not set. Please configure AU_RUBBER_EMAIL_HOST, AU_RUBBER_EMAIL_USER, and AU_RUBBER_EMAIL_PASSWORD environment variables.",
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
