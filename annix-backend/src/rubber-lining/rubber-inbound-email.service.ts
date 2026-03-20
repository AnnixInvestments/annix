import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateUniqueId, nowMillis } from "../lib/datetime";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE, StorageResult } from "../storage/storage.interface";
import { RubberCompany } from "./entities/rubber-company.entity";
import { DeliveryNoteStatus, DeliveryNoteType } from "./entities/rubber-delivery-note.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberTaxInvoiceService } from "./rubber-tax-invoice.service";

export interface ParsedCompoundCode {
  brand: string;
  grade: string;
  shoreHardness: number;
  color: string;
  colorName: string;
  curingMethod: string;
  curingMethodName: string;
  supplierCode: string;
  rubberType: string;
}

const COLOR_MAP: Record<string, string> = {
  R: "Red",
  B: "Black",
  G: "Grey",
  W: "White",
  N: "Natural",
  Y: "Yellow",
  O: "Orange",
  GR: "Green",
};

const CURING_MAP: Record<string, string> = {
  SC: "Steam Cured",
  AC: "Autoclave Cured",
  PC: "Press Cured",
  RC: "Rotocure",
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");

export interface InboundEmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  size: number;
}

export interface InboundEmailData {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments: InboundEmailAttachment[];
}

export interface ProcessedEmailResult {
  success: boolean;
  cocIds: number[];
  deliveryNoteIds: number[];
  taxInvoiceIds: number[];
  errors: string[];
}

export interface AnalyzedFile {
  filename: string;
  isGraph: boolean;
  cocType: SupplierCocType | null;
  companyId: number | null;
  companyName: string | null;
  extractedData: Record<string, unknown> | null;
  batchNumbers: string[];
  linkedToIndex: number | null;
  pdfText?: string;
}

export interface AnalyzeFilesResult {
  files: AnalyzedFile[];
  dataPdfs: number[];
  graphPdfs: number[];
}

export interface AnalyzedCustomerDnFile {
  filename: string;
  originalFileIndex: number;
  deliveryNoteNumber: string | null;
  customerReference: string | null;
  deliveryDate: string | null;
  customerName: string | null;
  customerId: number | null;
  pageInfo: { currentPage: number | null; totalPages: number | null } | null;
  sourcePages: number[] | null;
  lineItems: Array<{
    lineNumber: number | null;
    compoundType: string | null;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: number | null;
    quantity: number | null;
    rollWeightKg: number | null;
    rollNumber: string | null;
    specificGravity: number | null;
    cocBatchNumbers: string[] | null;
  }>;
  pdfText: string;
}

export interface CustomerDnGroup {
  deliveryNoteNumber: string;
  customerReference: string | null;
  deliveryDate: string | null;
  customerId: number | null;
  customerName: string | null;
  files: Array<{
    fileIndex: number;
    filename: string;
    pageNumber: number | null;
  }>;
  allLineItems: AnalyzedCustomerDnFile["lineItems"];
}

export interface AnalyzeCustomerDnsResult {
  files: AnalyzedCustomerDnFile[];
  groups: CustomerDnGroup[];
  unmatchedCustomerNames: string[];
  existingDnNumbers: string[];
}

interface SupplierMapping {
  company: RubberCompany;
  cocType: SupplierCocType;
  deliveryNoteType: DeliveryNoteType;
}

@Injectable()
export class RubberInboundEmailService {
  private readonly logger = new Logger(RubberInboundEmailService.name);

  constructor(
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
    private cocService: RubberCocService,
    private deliveryNoteService: RubberDeliveryNoteService,
    private taxInvoiceService: RubberTaxInvoiceService,
    private aiChatService: AiChatService,
    private cocExtractionService: RubberCocExtractionService,
    private auCocReadinessService: RubberAuCocReadinessService,
  ) {}

  async processInboundEmail(emailData: InboundEmailData): Promise<ProcessedEmailResult> {
    const result: ProcessedEmailResult = {
      success: false,
      cocIds: [],
      deliveryNoteIds: [],
      taxInvoiceIds: [],
      errors: [],
    };

    this.logger.log(
      `Processing inbound email from: ${emailData.from}, subject: ${emailData.subject}`,
    );

    const supportedAttachments = emailData.attachments.filter(
      (att) =>
        att.contentType === "application/pdf" ||
        att.filename?.toLowerCase().endsWith(".pdf") ||
        this.isExcelFile(att.filename, att.contentType) ||
        this.isWordFile(att.filename, att.contentType),
    );

    if (supportedAttachments.length === 0) {
      result.errors = [...result.errors, "No PDF, Excel, or Word attachments found in email"];
      this.logger.warn("No PDF, Excel, or Word attachments found in email");
      return result;
    }

    const documentType = this.determineDocumentType(emailData.subject);

    if (documentType === "coc") {
      await this.processCocAttachments(supportedAttachments, emailData, result);
    } else {
      await this.processNonCocAttachments(supportedAttachments, emailData, documentType, result);
    }

    result.success =
      result.cocIds.length > 0 ||
      result.deliveryNoteIds.length > 0 ||
      result.taxInvoiceIds.length > 0;
    return result;
  }

  private async processCocAttachments(
    attachments: InboundEmailAttachment[],
    emailData: InboundEmailData,
    result: ProcessedEmailResult,
  ): Promise<void> {
    const classificationResults = await Promise.allSettled(
      attachments.map(async (attachment) => {
        const pdfText = await this.extractTextFromAttachment(attachment);
        const graphResult = this.detectIfGraph(pdfText, attachment.filename);

        const supplierMapping = graphResult.isGraph
          ? null
          : await this.identifySupplierFromDocument(
              pdfText,
              attachment.filename,
              emailData.from,
              emailData.subject,
            );

        return {
          attachment,
          pdfText,
          isGraph: graphResult.isGraph,
          batchNumbers: graphResult.isGraph
            ? graphResult.batchNumbers
            : this.extractBatchNumbersFromText(pdfText),
          supplierMapping,
        };
      }),
    );

    const classified = classificationResults.reduce<
      Array<{
        attachment: InboundEmailAttachment;
        pdfText: string;
        isGraph: boolean;
        batchNumbers: string[];
        supplierMapping: SupplierMapping | null;
      }>
    >((acc, settledResult, i) => {
      if (settledResult.status === "fulfilled") {
        return [...acc, settledResult.value];
      }
      const errorMsg = `Failed to classify attachment ${attachments[i].filename}: ${settledResult.reason?.message}`;
      result.errors = [...result.errors, errorMsg];
      this.logger.error(errorMsg);
      return acc;
    }, []);

    const certs = classified.filter((c) => !c.isGraph);
    const graphs = classified.filter((c) => c.isGraph);

    const certRecords = await certs.reduce(
      async (accPromise, cert) => {
        const acc = await accPromise;
        try {
          if (!cert.supplierMapping) {
            const errorMsg = `Could not identify supplier for attachment: ${cert.attachment.filename}`;
            result.errors = [...result.errors, errorMsg];
            this.logger.warn(errorMsg);
            return acc;
          }

          try {
            const actualType = await this.classifyDocumentType(
              cert.pdfText,
              cert.attachment.filename,
            );
            if (actualType !== "coc") {
              this.logger.log(
                `Rerouting ${cert.attachment.filename} from CoC to ${actualType} (supplier: ${cert.supplierMapping.company.name})`,
              );
              await this.processNonCocAttachments([cert.attachment], emailData, actualType, result);
              return acc;
            }
          } catch (error) {
            this.logger.warn(
              `Classification failed for ${cert.attachment.filename}, treating as CoC: ${error.message}`,
            );
          }

          this.logger.log(
            `Identified supplier from document: ${cert.supplierMapping.company.name} (${cert.supplierMapping.cocType})`,
          );

          const storageResult = await this.saveAttachment(
            cert.attachment,
            cert.supplierMapping.company.id,
            "coc",
          );

          const coc = await this.cocService.createSupplierCoc(
            {
              cocType: cert.supplierMapping.cocType,
              supplierCompanyId: cert.supplierMapping.company.id,
              documentPath: storageResult.path,
            },
            `inbound-email:${emailData.from}`,
          );
          result.cocIds = [...result.cocIds, coc.id];
          this.logger.log(`Created Supplier CoC ${coc.id} from email attachment`);

          this.autoExtractCoc(coc.id, cert.supplierMapping.cocType, cert.pdfText);

          return [
            ...acc,
            {
              cocId: coc.id,
              batchNumbers: cert.batchNumbers,
              companyId: cert.supplierMapping.company.id,
              filename: cert.attachment.filename,
            },
          ];
        } catch (error) {
          const errorMsg = `Failed to process cert attachment ${cert.attachment.filename}: ${error.message}`;
          result.errors = [...result.errors, errorMsg];
          this.logger.error(errorMsg);
          return acc;
        }
      },
      Promise.resolve(
        [] as Array<{ cocId: number; batchNumbers: string[]; companyId: number; filename: string }>,
      ),
    );

    await graphs.reduce(async (accPromise, graph) => {
      await accPromise;
      try {
        const normalizedGraphBatches = graph.batchNumbers.map((b) => b.replace(/^[Bb]/, ""));

        const matchingCert =
          certRecords.find((cert) =>
            normalizedGraphBatches.some((gb) => cert.batchNumbers.includes(gb)),
          ) || this.matchGraphByCertFilename(graph.attachment.filename, certRecords);

        const multerFile: Express.Multer.File = {
          fieldname: "file",
          originalname: graph.attachment.filename,
          encoding: "7bit",
          mimetype: graph.attachment.contentType,
          size: graph.attachment.size,
          buffer: graph.attachment.content,
          stream: null as never,
          destination: "",
          filename: "",
          path: "",
        };

        if (matchingCert) {
          const subPath = `au-rubber/graphs/${matchingCert.companyId}`;
          const storageResult = await this.storageService.upload(multerFile, subPath);
          await this.cocService.updateSupplierCoc(matchingCert.cocId, {
            graphPdfPath: storageResult.path,
          });
          this.logger.log(`Linked graph PDF to CoC ${matchingCert.cocId} via batch number match`);
          this.triggerReadinessCheckForGraphLink(matchingCert.cocId);
        } else {
          const linkedCocId = await this.linkGraphToExistingCoc(
            multerFile,
            graph.pdfText,
            normalizedGraphBatches,
          );

          if (linkedCocId) {
            this.logger.log(
              `Linked graph PDF to existing CoC ${linkedCocId} via batch number fallback`,
            );
            this.triggerReadinessCheckForGraphLink(linkedCocId);
          } else {
            this.logger.warn(
              `Graph PDF ${graph.attachment.filename} could not be matched to any CoC - skipping (batches: ${normalizedGraphBatches.join(", ")})`,
            );
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process graph attachment ${graph.attachment.filename}: ${error.message}`;
        result.errors = [...result.errors, errorMsg];
        this.logger.error(errorMsg);
      }
    }, Promise.resolve());
  }

  private async processNonCocAttachments(
    attachments: InboundEmailAttachment[],
    emailData: InboundEmailData,
    documentType: "delivery_note" | "tax_invoice",
    result: ProcessedEmailResult,
  ): Promise<void> {
    await attachments.reduce(async (accPromise, attachment) => {
      await accPromise;
      try {
        const documentText = await this.extractTextFromAttachment(attachment);

        const supplierMapping = await this.identifySupplierFromDocument(
          documentText,
          attachment.filename,
          emailData.from,
          emailData.subject,
        );

        if (!supplierMapping) {
          const errorMsg = `Could not identify supplier for attachment: ${attachment.filename}`;
          result.errors = [...result.errors, errorMsg];
          this.logger.warn(errorMsg);
          return;
        }

        this.logger.log(
          `Identified supplier from document: ${supplierMapping.company.name} (${supplierMapping.cocType})`,
        );

        try {
          const actualType = await this.classifyDocumentType(documentText, attachment.filename);
          if (actualType === "coc") {
            this.logger.log(
              `Rerouting ${attachment.filename} from ${documentType} to CoC based on content (supplier: ${supplierMapping.company.name})`,
            );
            await this.processCocAttachments([attachment], emailData, result);
            return;
          }
          if (actualType !== documentType) {
            this.logger.log(
              `Reclassifying ${attachment.filename} from ${documentType} to ${actualType} based on content`,
            );
          }
        } catch (classifyError) {
          this.logger.warn(
            `Content classification failed for ${attachment.filename}, keeping as ${documentType}: ${classifyError.message}`,
          );
        }

        const storageResult = await this.saveAttachment(
          attachment,
          supplierMapping.company.id,
          documentType,
        );

        if (documentType === "tax_invoice") {
          const invoiceNumber = `INV-${nowMillis()}`;
          const invoice = await this.taxInvoiceService.createTaxInvoice(
            {
              invoiceNumber,
              invoiceType: TaxInvoiceType.SUPPLIER,
              companyId: supplierMapping.company.id,
              documentPath: storageResult.path,
            },
            `inbound-email:${emailData.from}`,
          );
          result.taxInvoiceIds = [...result.taxInvoiceIds, invoice.id];
          this.logger.log(`Created Tax Invoice ${invoice.id} from email attachment`);

          try {
            const correctionHints = await this.taxInvoiceService.correctionHintsForSupplier(
              supplierMapping.company.name,
            );
            const isPdf =
              attachment.contentType === "application/pdf" ||
              attachment.filename?.toLowerCase().endsWith(".pdf");

            if (isPdf) {
              const pdfText = await this.extractTextFromPdf(attachment.content);
              if (pdfText.length >= 50) {
                const extractionResult = await this.cocExtractionService.extractTaxInvoice(
                  pdfText,
                  correctionHints,
                );
                await this.taxInvoiceService.setExtractedData(invoice.id, extractionResult.data);
                this.logger.log(
                  `Auto-extracted Tax Invoice ${invoice.id} in ${extractionResult.processingTimeMs}ms`,
                );
              } else {
                this.logger.log(
                  `Tax Invoice ${invoice.id} PDF text too short (${pdfText.length} chars), falling back to OCR`,
                );
                const extractionResult =
                  await this.cocExtractionService.extractTaxInvoiceFromImages(
                    attachment.content,
                    correctionHints,
                  );
                await this.taxInvoiceService.setExtractedData(invoice.id, extractionResult.data);
                this.logger.log(
                  `Auto-extracted Tax Invoice ${invoice.id} via OCR in ${extractionResult.processingTimeMs}ms`,
                );
              }
            } else {
              const extractionResult = await this.cocExtractionService.extractTaxInvoice(
                documentText,
                correctionHints,
              );
              await this.taxInvoiceService.setExtractedData(invoice.id, extractionResult.data);
              this.logger.log(
                `Auto-extracted Tax Invoice ${invoice.id} from ${attachment.contentType} in ${extractionResult.processingTimeMs}ms`,
              );
            }
          } catch (extractionError) {
            this.logger.error(
              `Failed to auto-extract Tax Invoice ${invoice.id}: ${extractionError.message}`,
            );
          }
        } else {
          const generatedDnNumber = `DN-${nowMillis()}`;
          const dn = await this.deliveryNoteService.createDeliveryNote(
            {
              deliveryNoteType: supplierMapping.deliveryNoteType,
              supplierCompanyId: supplierMapping.company.id,
              documentPath: storageResult.path,
              deliveryNoteNumber: generatedDnNumber,
            },
            `inbound-email:${emailData.from}`,
          );
          result.deliveryNoteIds = [...result.deliveryNoteIds, dn.id];
          this.logger.log(`Created Delivery Note ${dn.id} from email attachment`);

          this.deliveryNoteService
            .autoLinkToSupplierCoc(dn.id)
            .catch((error) =>
              this.logger.error(`Auto-link DN ${dn.id} to CoC failed: ${error.message}`),
            );
        }
      } catch (error) {
        const errorMsg = `Failed to process attachment ${attachment.filename}: ${error.message}`;
        result.errors = [...result.errors, errorMsg];
        this.logger.error(errorMsg);
      }
    }, Promise.resolve());
  }

  private isExcelFile(filename: string | undefined, contentType: string): boolean {
    const excelMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/x-excel",
    ];
    const filenameLower = filename?.toLowerCase() ?? "";
    return (
      excelMimeTypes.includes(contentType) ||
      filenameLower.endsWith(".xlsx") ||
      filenameLower.endsWith(".xls")
    );
  }

  private isWordFile(filename: string | undefined, contentType: string): boolean {
    const wordMimeTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const filenameLower = filename?.toLowerCase() ?? "";
    return (
      wordMimeTypes.includes(contentType) ||
      filenameLower.endsWith(".doc") ||
      filenameLower.endsWith(".docx")
    );
  }

  private async extractTextFromWord(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  private async extractTextFromAttachment(attachment: InboundEmailAttachment): Promise<string> {
    if (this.isExcelFile(attachment.filename, attachment.contentType)) {
      return this.extractTextFromExcel(attachment.content);
    } else if (this.isWordFile(attachment.filename, attachment.contentType)) {
      return this.extractTextFromWord(attachment.content);
    } else {
      return this.extractTextFromPdf(attachment.content);
    }
  }

  private extractTextFromExcel(buffer: Buffer): string {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets = workbook.SheetNames.map((name: string) => {
      const sheet = workbook.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t", blankrows: false });
      return `--- SHEET: ${name} ---\n${csv}`;
    });
    return sheets.join("\n\n");
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const pdfData = await pdfParse(buffer);
      const numPages = pdfData.numpages || 1;
      const text = pdfData.text || "";

      if (numPages > 1) {
        this.logger.log(`PDF has ${numPages} pages - adding page count hint`);
        return `DOCUMENT HAS ${numPages} PAGES. Each page likely contains a separate delivery note.\n\n${text}`;
      }

      return text;
    } catch {
      try {
        const text = this.extractTextFromExcel(buffer);
        this.logger.log(`Extracted text from Excel file (${text.length} chars)`);
        return text;
      } catch {
        this.logger.error("Failed to extract text from attachment (not a valid PDF or Excel)");
        return "";
      }
    }
  }

  private classifyImpiloCocType(pdfText: string): SupplierCocType {
    const textLower = pdfText.toLowerCase();

    const compounderIndicators = [
      textLower.includes("batch certificates"),
      textLower.includes("batch certificate"),
      textLower.includes("s' min") || textLower.includes("s'min") || textLower.includes("s min"),
      textLower.includes("s' max") || textLower.includes("s'max") || textLower.includes("s max"),
      textLower.includes("tc 90") || textLower.includes("tc90"),
      textLower.includes("ts 2") || textLower.includes("ts2"),
      textLower.includes("rheometer") || textLower.includes("scarabaeus"),
    ].filter(Boolean).length;

    const calendererIndicators = [
      textLower.includes("calender roll"),
      textLower.includes("production date of calender"),
      textLower.includes("roll no.") || textLower.includes("roll number"),
      textLower.includes("waybill") || textLower.includes("waybil"),
      textLower.includes("purchase order number"),
    ].filter(Boolean).length;

    this.logger.log(
      `Impilo CoC type classification - compounder indicators: ${compounderIndicators}, calenderer indicators: ${calendererIndicators}`,
    );

    if (compounderIndicators > calendererIndicators) {
      this.logger.log("Classified Impilo document as COMPOUNDER (batch certificate)");
      return SupplierCocType.COMPOUNDER;
    } else if (calendererIndicators > compounderIndicators) {
      this.logger.log("Classified Impilo document as CALENDARER (calendered rolls)");
      return SupplierCocType.CALENDARER;
    }

    this.logger.log("Impilo CoC type inconclusive from rules, defaulting to CALENDARER");
    return SupplierCocType.CALENDARER;
  }

  private async classifyImpiloCocTypeWithAiFallback(pdfText: string): Promise<SupplierCocType> {
    const textLower = pdfText.toLowerCase();

    const compounderIndicators = [
      textLower.includes("batch certificates") || textLower.includes("batch certificate"),
      textLower.includes("s' min") || textLower.includes("s'min") || textLower.includes("s min"),
      textLower.includes("tc 90") || textLower.includes("tc90"),
      textLower.includes("rheometer") || textLower.includes("scarabaeus"),
    ].filter(Boolean).length;

    const calendererIndicators = [
      textLower.includes("calender roll"),
      textLower.includes("production date of calender"),
      textLower.includes("roll no.") || textLower.includes("roll number"),
    ].filter(Boolean).length;

    if (compounderIndicators > 0 && calendererIndicators === 0) {
      this.logger.log("Rule-based: Impilo document is COMPOUNDER (batch certificate)");
      return SupplierCocType.COMPOUNDER;
    } else if (calendererIndicators > 0 && compounderIndicators === 0) {
      this.logger.log("Rule-based: Impilo document is CALENDARER (calendered rolls)");
      return SupplierCocType.CALENDARER;
    }

    this.logger.log("Rule-based classification inconclusive for Impilo, falling back to AI");
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI not available for Impilo CoC classification, defaulting to CALENDARER");
      return SupplierCocType.CALENDARER;
    }

    const truncatedText = pdfText.length > 3000 ? pdfText.substring(0, 3000) : pdfText;
    const systemPrompt = `You classify rubber industry documents from Impilo Industries. Determine if this is a COMPOUNDER batch certificate or a CALENDARER roll certificate.

COMPOUNDER indicators: "Batch Certificates" header, batch test table with columns like Shore A, S'min, S'max, TS2, TC90, rheometer data, Pass/Fail per batch.
CALENDARER indicators: "Calender Roll" in title, per-roll Shore A readings, shared density/tensile/elongation, delivery note numbers, waybill numbers, production date of calender rolls.

Respond ONLY with JSON: {"cocType": "COMPOUNDER" | "CALENDARER", "reason": "brief explanation"}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: `Classify this Impilo document:\n\n${truncatedText}` }],
        systemPrompt,
      );
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.cocType === "COMPOUNDER" || parsed.cocType === "CALENDARER") {
          this.logger.log(`AI classified Impilo document as ${parsed.cocType}: ${parsed.reason}`);
          return parsed.cocType === "COMPOUNDER"
            ? SupplierCocType.COMPOUNDER
            : SupplierCocType.CALENDARER;
        }
      }
    } catch (error) {
      this.logger.warn(`AI Impilo classification failed: ${error.message}`);
    }

    this.logger.log("AI fallback inconclusive, defaulting to CALENDARER");
    return SupplierCocType.CALENDARER;
  }

  private async identifySupplierFromDocument(
    pdfText: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<SupplierMapping | null> {
    const companies = await this.companyRepository.find();
    const pdfTextLower = pdfText.toLowerCase();
    const filenameLower = filename.toLowerCase();
    const fromEmailLower = fromEmail.toLowerCase();
    const subjectLower = subject.toLowerCase();

    this.logger.log(`PDF text length: ${pdfText.length} characters`);
    this.logger.log(`PDF text preview: ${pdfText.substring(0, 500)}...`);

    const hasImpiloInDocument =
      pdfTextLower.includes("impilo") ||
      pdfTextLower.includes("calendarer") ||
      pdfTextLower.includes("calendering");

    const hasSnInDocument =
      pdfTextLower.includes("s&n") ||
      pdfTextLower.includes("s & n") ||
      pdfTextLower.includes("sn rubber") ||
      pdfTextLower.includes("compounder");

    this.logger.log(
      `Document analysis - Impilo found: ${hasImpiloInDocument}, S&N found: ${hasSnInDocument}`,
    );

    if (hasImpiloInDocument && !hasSnInDocument) {
      const impiloCompany = companies.find(
        (c) =>
          c.name.toLowerCase().includes("impilo") || c.name.toLowerCase().includes("calendarer"),
      );
      if (impiloCompany) {
        const cocType = this.classifyImpiloCocType(pdfText);
        const deliveryNoteType =
          cocType === SupplierCocType.COMPOUNDER
            ? DeliveryNoteType.COMPOUND
            : DeliveryNoteType.ROLL;
        this.logger.log(
          `Identified supplier from document content: ${impiloCompany.name} (${cocType})`,
        );
        return {
          company: impiloCompany,
          cocType,
          deliveryNoteType,
        };
      }
    }

    if (hasSnInDocument && !hasImpiloInDocument) {
      const compounderCompany = companies.find(
        (c) => c.name.toLowerCase().includes("s&n") || c.name.toLowerCase().includes("compounder"),
      );
      if (compounderCompany) {
        this.logger.log(`Identified supplier from document content: ${compounderCompany.name}`);
        return {
          company: compounderCompany,
          cocType: SupplierCocType.COMPOUNDER,
          deliveryNoteType: DeliveryNoteType.COMPOUND,
        };
      }
    }

    if (filenameLower.includes("imp-") || filenameLower.includes("impilo")) {
      const impiloCompany = companies.find(
        (c) =>
          c.name.toLowerCase().includes("impilo") || c.name.toLowerCase().includes("calendarer"),
      );
      if (impiloCompany) {
        const cocType = this.classifyImpiloCocType(pdfText);
        const deliveryNoteType =
          cocType === SupplierCocType.COMPOUNDER
            ? DeliveryNoteType.COMPOUND
            : DeliveryNoteType.ROLL;
        this.logger.log(`Identified supplier from filename: ${impiloCompany.name} (${cocType})`);
        return {
          company: impiloCompany,
          cocType,
          deliveryNoteType,
        };
      }
    }

    const calendererMatch = companies.find((company) => {
      const companyNameLower = company.name.toLowerCase();
      return (
        (companyNameLower.includes("impilo") || companyNameLower.includes("calendarer")) &&
        (fromEmailLower.includes("impilo") ||
          subjectLower.includes("impilo") ||
          subjectLower.includes("calendarer"))
      );
    });

    if (calendererMatch) {
      const cocType = this.classifyImpiloCocType(pdfText);
      const deliveryNoteType =
        cocType === SupplierCocType.COMPOUNDER ? DeliveryNoteType.COMPOUND : DeliveryNoteType.ROLL;
      return {
        company: calendererMatch,
        cocType,
        deliveryNoteType,
      };
    }

    const compounderMatch = companies.find((company) => {
      const companyNameLower = company.name.toLowerCase();
      return (
        (companyNameLower.includes("s&n") || companyNameLower.includes("compounder")) &&
        (fromEmailLower.includes("sandrubber") ||
          fromEmailLower.includes("snrubber") ||
          subjectLower.includes("s&n"))
      );
    });

    if (compounderMatch) {
      return {
        company: compounderMatch,
        cocType: SupplierCocType.COMPOUNDER,
        deliveryNoteType: DeliveryNoteType.COMPOUND,
      };
    }

    return null;
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
      subjectLower.includes("despatch") ||
      subjectLower.includes("dispatch") ||
      subjectLower.includes("waybill") ||
      subjectLower.includes("packing slip") ||
      subjectLower.includes("packing list")
    ) {
      return "delivery_note";
    }

    return "coc";
  }

  private async classifyDocumentType(
    pdfText: string,
    filename: string,
  ): Promise<"coc" | "delivery_note" | "tax_invoice"> {
    const textLower = pdfText.toLowerCase();
    const filenameLower = filename.toLowerCase();

    const cocKeywords = [
      "certificate of conformance",
      "certificate of compliance",
      "certificate of quality",
      "test certificate",
      "test report",
      "shore hardness",
      "tensile strength",
      "specific gravity",
      "elongation at break",
      "hardness irhd",
    ];
    const cocFilenameKeywords = ["coc", "cert", "certificate", "test_report", "test-report"];
    const taxInvoiceKeywords = [
      "tax invoice",
      "invoice number",
      "invoice date",
      "payment terms",
      "amount due",
      "vat invoice",
    ];
    const deliveryNoteKeywords = [
      "delivery note",
      "goods received",
      "dispatch note",
      "despatch note",
      "packing slip",
      "packing list",
      "waybill",
      "way bill",
      "goods delivered",
      "proof of delivery",
    ];

    const taxInvoiceFilenameKeywords = ["invoice", "tax_inv", "tax-inv"];
    const deliveryNoteFilenameKeywords = [
      "delivery",
      "dn_",
      "dn-",
      "despatch",
      "dispatch",
      "waybill",
      "packing",
    ];

    if (
      cocKeywords.some((kw) => textLower.includes(kw)) ||
      cocFilenameKeywords.some((kw) => filenameLower.includes(kw))
    ) {
      this.logger.log(`Rule-based classification: coc (file: ${filename})`);
      return "coc";
    }

    if (
      taxInvoiceKeywords.some((kw) => textLower.includes(kw)) ||
      taxInvoiceFilenameKeywords.some((kw) => filenameLower.includes(kw))
    ) {
      this.logger.log(`Rule-based classification: tax_invoice (file: ${filename})`);
      return "tax_invoice";
    }

    if (
      deliveryNoteKeywords.some((kw) => textLower.includes(kw)) ||
      deliveryNoteFilenameKeywords.some((kw) => filenameLower.includes(kw))
    ) {
      this.logger.log(`Rule-based classification: delivery_note (file: ${filename})`);
      return "delivery_note";
    }

    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      return "coc";
    }

    const truncatedText = pdfText.length > 3000 ? pdfText.substring(0, 3000) : pdfText;

    const systemPrompt = `You classify documents for AU Industries' rubber lining operations. Determine if the document is a Certificate of Conformance (CoC), a delivery note, or a tax invoice.

Respond ONLY with a JSON object: {"documentType": "coc"|"delivery_note"|"tax_invoice", "reason": "brief explanation"}`;

    const userMessage = `Classify this document.

Filename: ${filename}

Content:
${truncatedText}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validTypes = ["coc", "delivery_note", "tax_invoice"];
        if (parsed.documentType && validTypes.includes(parsed.documentType)) {
          this.logger.log(
            `AI classification: ${parsed.documentType} (file: ${filename}, reason: ${parsed.reason})`,
          );
          return parsed.documentType;
        }
      }
    } catch (error) {
      this.logger.warn(`AI classification failed for ${filename}: ${error.message}`);
    }

    return "coc";
  }

  private async saveAttachment(
    attachment: InboundEmailAttachment,
    companyId: number,
    documentType: "coc" | "delivery_note" | "tax_invoice",
  ): Promise<StorageResult> {
    const storageFolder: Record<string, string> = {
      coc: "cocs",
      delivery_note: "delivery-notes",
      tax_invoice: "tax-invoices",
    };

    const multerFile: Express.Multer.File = {
      fieldname: "file",
      originalname: attachment.filename,
      encoding: "7bit",
      mimetype: attachment.contentType,
      size: attachment.size,
      buffer: attachment.content,
      stream: null as never,
      destination: "",
      filename: "",
      path: "",
    };

    const subPath = `au-rubber/${storageFolder[documentType]}/${companyId}`;
    return this.storageService.upload(multerFile, subPath);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    documentType: "supplier_coc" | "delivery_note" | "tax_invoice",
    metadata: {
      supplierCompanyId?: number;
      cocType?: SupplierCocType;
      deliveryNoteType?: DeliveryNoteType;
      cocNumber?: string;
      compoundCode?: string;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      invoiceType?: TaxInvoiceType;
      companyId?: number;
      invoiceNumber?: string;
      invoiceDate?: string;
    },
    createdBy?: string,
  ): Promise<{ cocIds?: number[]; deliveryNoteIds?: number[]; taxInvoiceIds?: number[] }> {
    const result: { cocIds?: number[]; deliveryNoteIds?: number[]; taxInvoiceIds?: number[] } = {};

    if (documentType === "supplier_coc") {
      result.cocIds = await files.reduce(
        async (accPromise, file) => {
          const acc = await accPromise;
          const pdfText = await this.extractTextFromPdf(file.buffer);

          const graphInfo = this.detectIfGraph(pdfText, file.originalname);
          if (graphInfo.isGraph) {
            const linkedCocId = await this.linkGraphToExistingCoc(
              file,
              pdfText,
              graphInfo.batchNumbers,
            );
            if (linkedCocId) {
              this.logger.log(`Linked graph PDF to existing CoC ${linkedCocId}`);
              return [...acc, linkedCocId];
            }
            this.logger.warn("Could not find matching COC for graph, creating new COC");
          }

          const supplierInfo = await this.identifySupplierWithAi(pdfText, file.originalname);

          const detectedCocType =
            supplierInfo?.cocType || metadata.cocType || SupplierCocType.COMPOUNDER;
          const detectedSupplierId = supplierInfo?.companyId || metadata.supplierCompanyId;

          const subPath = detectedSupplierId
            ? `au-rubber/cocs/${detectedSupplierId}`
            : `au-rubber/cocs/${detectedCocType.toLowerCase()}`;

          const storageResult = await this.storageService.upload(file, subPath);

          const coc = await this.cocService.createSupplierCoc(
            {
              cocType: detectedCocType,
              supplierCompanyId: detectedSupplierId,
              documentPath: storageResult.path,
              cocNumber: metadata.cocNumber,
              compoundCode: metadata.compoundCode,
            },
            createdBy,
          );

          this.autoExtractCoc(coc.id, detectedCocType, pdfText);
          return [...acc, coc.id];
        },
        Promise.resolve([] as number[]),
      );
    } else if (documentType === "tax_invoice") {
      const companyId = metadata.companyId as number;
      const company = companyId
        ? await this.companyRepository.findOne({ where: { id: companyId } })
        : null;
      const subPath = `au-rubber/tax-invoices/${companyId}`;

      result.taxInvoiceIds = await files.reduce(
        async (accPromise, file) => {
          const acc = await accPromise;
          const storageResult = await this.storageService.upload(file, subPath);

          const invoiceNumber = metadata.invoiceNumber || file.originalname.replace(/\.\w+$/i, "");
          const invoice = await this.taxInvoiceService.createTaxInvoice(
            {
              invoiceNumber,
              invoiceDate: metadata.invoiceDate,
              invoiceType: metadata.invoiceType || TaxInvoiceType.SUPPLIER,
              companyId,
              documentPath: storageResult.path,
            },
            createdBy,
          );

          this.autoExtractTaxInvoice(invoice.id, file, company?.name ?? null);
          return [...acc, invoice.id];
        },
        Promise.resolve([] as number[]),
      );
    } else {
      const dnType = metadata.deliveryNoteType || DeliveryNoteType.COMPOUND;

      result.deliveryNoteIds = await files.reduce(
        async (accPromise, file) => {
          const acc = await accPromise;

          const supplierCompanyId = metadata.supplierCompanyId
            ? metadata.supplierCompanyId
            : await this.detectSupplierFromPdf(file.buffer, file.originalname);

          const subPath = `au-rubber/delivery-notes/${supplierCompanyId}`;
          const storageResult = await this.storageService.upload(file, subPath);

          const dnNumber = metadata.deliveryNoteNumber || `DN-${nowMillis()}`;
          const dn = await this.deliveryNoteService.createDeliveryNote(
            {
              deliveryNoteType: dnType,
              supplierCompanyId,
              documentPath: storageResult.path,
              deliveryNoteNumber: dnNumber,
              deliveryDate: metadata.deliveryDate,
            },
            createdBy,
          );

          this.autoExtractAndSplitDeliveryNote(dn.id, file.buffer, dnType);
          return [...acc, dn.id];
        },
        Promise.resolve([] as number[]),
      );
    }

    return result;
  }

  private autoExtractTaxInvoice(
    invoiceId: number,
    file: Express.Multer.File,
    companyName: string | null,
  ): void {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    const isPdf = ext === "pdf";

    (async () => {
      try {
        const correctionHints = companyName
          ? await this.taxInvoiceService.correctionHintsForSupplier(companyName)
          : null;

        if (isPdf) {
          const pdfText = await this.extractTextFromPdf(file.buffer);
          if (pdfText.length >= 50) {
            const extractionResult = await this.cocExtractionService.extractTaxInvoice(
              pdfText,
              correctionHints,
            );
            await this.taxInvoiceService.setExtractedData(invoiceId, extractionResult.data);
            this.logger.log(
              `Auto-extracted Tax Invoice ${invoiceId} in ${extractionResult.processingTimeMs}ms`,
            );
          } else {
            const extractionResult = await this.cocExtractionService.extractTaxInvoiceFromImages(
              file.buffer,
              correctionHints,
            );
            await this.taxInvoiceService.setExtractedData(invoiceId, extractionResult.data);
            this.logger.log(
              `Auto-extracted Tax Invoice ${invoiceId} via OCR in ${extractionResult.processingTimeMs}ms`,
            );
          }
        } else {
          const mammoth = await import("mammoth");
          const textResult = await mammoth.extractRawText({ buffer: file.buffer });
          const docText = textResult.value || "";
          if (docText.length >= 20) {
            const extractionResult = await this.cocExtractionService.extractTaxInvoice(
              docText,
              correctionHints,
            );
            await this.taxInvoiceService.setExtractedData(invoiceId, extractionResult.data);
            this.logger.log(
              `Auto-extracted Tax Invoice ${invoiceId} from document in ${extractionResult.processingTimeMs}ms`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-extract Tax Invoice ${invoiceId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  private autoExtractAndSplitDeliveryNote(
    deliveryNoteId: number,
    pdfBuffer: Buffer,
    dnType: DeliveryNoteType,
  ): void {
    (async () => {
      try {
        const isRoll = dnType === DeliveryNoteType.ROLL;

        const extractedData = await (async () => {
          if (isRoll) {
            const customerResult =
              await this.cocExtractionService.extractCustomerDeliveryNoteFromImages(pdfBuffer);

            const supplierDns = customerResult.deliveryNotes.filter((dn) => {
              const supplier = (dn.supplierName || "").toLowerCase();
              const isCdn = supplier.includes("au industrie") || supplier.includes("au industries");
              if (isCdn) {
                this.logger.log(
                  `[SupplierDN] Filtering out customer DN "${dn.deliveryNoteNumber}" (supplier: ${dn.supplierName}) from supplier extraction`,
                );
              }
              return !isCdn;
            });
            const dnsToProcess =
              supplierDns.length > 0 ? supplierDns : customerResult.deliveryNotes;

            const allRolls = dnsToProcess.flatMap((dn, dnIdx) =>
              (dn.lineItems || [])
                .filter((item) => item != null && typeof item === "object")
                .map((item) => ({
                  rollNumber: item.rollNumber ?? null,
                  thicknessMm: item.thicknessMm ?? null,
                  widthMm: item.widthMm ?? null,
                  lengthM: item.lengthM ?? null,
                  weightKg: item.actualWeightKg ?? null,
                  areaSqM:
                    item.widthMm && item.lengthM ? (item.widthMm * item.lengthM) / 1000 : null,
                  deliveryNoteNumber: dn.deliveryNoteNumber ?? null,
                  deliveryDate: dn.deliveryDate ?? null,
                  customerName: dn.customerName ?? null,
                  customerReference: dn.customerReference ?? null,
                  supplierName: dn.supplierName ?? null,
                  pageNumber: dnIdx + 1,
                })),
            );

            const podPageNumbers = this.resolvePodPageNumbersByOrder(
              customerResult.podPages,
              dnsToProcess,
            );
            const dnMetadata = dnsToProcess[0];
            const dnNumber = dnMetadata?.deliveryNoteNumber || null;
            if (dnNumber && podPageNumbers[dnNumber]) {
              await this.deliveryNoteService.setPodPageNumbers(
                deliveryNoteId,
                podPageNumbers[dnNumber],
              );
            }

            return {
              deliveryNoteNumber: dnMetadata?.deliveryNoteNumber ?? null,
              deliveryDate: dnMetadata?.deliveryDate ?? null,
              customerName: dnMetadata?.customerName ?? null,
              customerReference: dnMetadata?.customerReference ?? null,
              supplierName: dnMetadata?.supplierName ?? null,
              rolls: allRolls,
            };
          } else {
            const pdfText = await this.extractTextFromPdf(pdfBuffer);
            const useOcr = pdfText.length < 50;
            const extractionResult = useOcr
              ? await this.cocExtractionService.extractDeliveryNoteFromImages(pdfBuffer)
              : await this.cocExtractionService.extractDeliveryNote(pdfText);
            return extractionResult.data;
          }
        })();

        await this.deliveryNoteService.setExtractedData(deliveryNoteId, extractedData);
        this.logger.log(`Auto-extracted delivery note ${deliveryNoteId}`);

        const splitResult = await this.deliveryNoteService.acceptExtractAndSplit(deliveryNoteId);
        if (splitResult.deliveryNoteIds.length > 1) {
          this.logger.log(
            `Auto-split delivery note ${deliveryNoteId} into ${splitResult.deliveryNoteIds.length} notes: ${splitResult.deliveryNoteIds.join(", ")}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-extract delivery note ${deliveryNoteId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  async analyzeFiles(files: Express.Multer.File[]): Promise<AnalyzeFilesResult> {
    this.logger.log(`Analyzing ${files.length} files for CoC data...`);
    const companies = await this.companyRepository.find();

    const analyzedFiles: AnalyzedFile[] = await Promise.all(
      files.map(async (file, i) => {
        this.logger.log(`Analyzing file ${i + 1}/${files.length}: ${file.originalname}`);

        const pdfText = await this.extractTextFromPdf(file.buffer);
        this.logger.log(`Extracted ${pdfText.length} characters from ${file.originalname}`);

        const graphInfo = this.detectIfGraph(pdfText, file.originalname);
        this.logger.log(
          `Graph detection for ${file.originalname}: isGraph=${graphInfo.isGraph}, batchNumbers=${graphInfo.batchNumbers.join(",")}`,
        );

        if (graphInfo.isGraph) {
          return {
            filename: file.originalname,
            isGraph: true,
            cocType: null,
            companyId: null,
            companyName: null,
            extractedData: null,
            batchNumbers: graphInfo.batchNumbers,
            linkedToIndex: null,
            pdfText,
          };
        }

        const filenameInfo = this.parseFilenameForCocInfo(file.originalname);

        const supplierInfo = await this.identifySupplierWithAi(pdfText, file.originalname);
        const cocType = supplierInfo?.cocType || SupplierCocType.COMPOUNDER;
        const companyId = supplierInfo?.companyId || null;
        const company = companyId ? companies.find((c) => c.id === companyId) : null;

        const extractedData: Record<string, unknown> | null = await (async () => {
          try {
            const extraction = await this.cocExtractionService.extractByType(cocType, pdfText);
            const data = extraction.data as Record<string, unknown>;
            this.logger.log(
              `Extracted data for ${file.originalname}: ${JSON.stringify(data).substring(0, 200)}`,
            );
            return data;
          } catch (error) {
            this.logger.error(`Failed to extract data from ${file.originalname}: ${error.message}`);
            return null;
          }
        })();

        const batchNumbersFromExtraction = (extractedData?.batchNumbers as string[]) || [];
        const batchNumbers =
          filenameInfo.batchNumbers.length > 0
            ? filenameInfo.batchNumbers
            : batchNumbersFromExtraction;

        const compoundCodeFromFilename = filenameInfo.compoundCode;
        const finalExtractedData =
          compoundCodeFromFilename && extractedData
            ? { ...extractedData, compoundCode: compoundCodeFromFilename }
            : extractedData;

        return {
          filename: file.originalname,
          isGraph: false,
          cocType,
          companyId,
          companyName: company?.name || null,
          extractedData: finalExtractedData,
          batchNumbers,
          linkedToIndex: null,
          pdfText,
        };
      }),
    );

    const dataPdfs = analyzedFiles.reduce<number[]>(
      (acc, f, i) => (f.isGraph ? acc : [...acc, i]),
      [],
    );
    const graphPdfs = analyzedFiles.reduce<number[]>(
      (acc, f, i) => (f.isGraph ? [...acc, i] : acc),
      [],
    );

    const linkedFiles = analyzedFiles.map((file, idx) => {
      if (!graphPdfs.includes(idx)) return file;

      const normalizedGraphBatches = file.batchNumbers.map((b) => b.replace(/^B/i, ""));

      const batchMatchIdx =
        file.batchNumbers.length > 0
          ? dataPdfs.find((dataIdx) => {
              const dataFile = analyzedFiles[dataIdx];
              const normalizedDataBatches = dataFile.batchNumbers.map((b) => b.replace(/^B/i, ""));
              return normalizedGraphBatches.some((gbn) => normalizedDataBatches.includes(gbn));
            })
          : null;

      if (batchMatchIdx != null) {
        const dataFile = analyzedFiles[batchMatchIdx];
        this.logger.log(
          `Linked graph ${file.filename} to data PDF ${dataFile.filename} via batch numbers`,
        );
        return {
          ...file,
          linkedToIndex: batchMatchIdx,
          cocType: dataFile.cocType,
          companyId: dataFile.companyId,
          companyName: dataFile.companyName,
        };
      }

      const graphBase = file.filename
        .replace(/\.pdf$/i, "")
        .replace(/[-_]?GRAPH$/i, "")
        .trim()
        .toLowerCase();

      const filenameMatchIdx = dataPdfs.find((dataIdx) => {
        const dataBase = analyzedFiles[dataIdx].filename
          .replace(/\.pdf$/i, "")
          .trim()
          .toLowerCase();
        return dataBase === graphBase;
      });

      if (filenameMatchIdx != null) {
        const dataFile = analyzedFiles[filenameMatchIdx];
        this.logger.log(
          `Linked graph ${file.filename} to data PDF ${dataFile.filename} via filename similarity`,
        );
        return {
          ...file,
          linkedToIndex: filenameMatchIdx,
          cocType: dataFile.cocType,
          companyId: dataFile.companyId,
          companyName: dataFile.companyName,
        };
      }

      return file;
    });

    return { files: linkedFiles, dataPdfs, graphPdfs };
  }

  async createCocsFromAnalysis(
    files: Express.Multer.File[],
    analysis: AnalyzeFilesResult,
    createdBy?: string,
  ): Promise<{ cocIds: number[] }> {
    const dataResult = await analysis.dataPdfs.reduce(
      async (accPromise, dataIdx) => {
        const acc = await accPromise;
        const analyzed = analysis.files[dataIdx];
        const file = files[dataIdx];

        const filenameInfo = this.parseFilenameForCocInfo(file.originalname);
        const compoundInfo = await this.processCompoundCodeFromFilename(file.originalname);

        const batchNumbers =
          filenameInfo.batchNumbers.length > 0 ? filenameInfo.batchNumbers : analyzed.batchNumbers;
        const cocNumber = batchNumbers.length > 0 ? this.formatBatchRange(batchNumbers) : null;

        const compoundCode =
          compoundInfo.compoundCode || (analyzed.extractedData?.compoundCode as string) || null;

        const subPath = analyzed.companyId
          ? `au-rubber/cocs/${analyzed.companyId}`
          : `au-rubber/cocs/${(analyzed.cocType || "compounder").toLowerCase()}`;

        const storageResult = await this.storageService.upload(file, subPath);

        const coc = await this.cocService.createSupplierCoc(
          {
            cocType: analyzed.cocType || SupplierCocType.COMPOUNDER,
            supplierCompanyId: analyzed.companyId || null,
            documentPath: storageResult.path,
            cocNumber,
            compoundCode,
          },
          createdBy,
        );

        if (analyzed.extractedData) {
          const enrichedData = {
            ...analyzed.extractedData,
            compoundCode,
            compoundCodingId: compoundInfo.compoundCodingId,
            parsedCompoundInfo: compoundInfo.parsedInfo,
          };
          await this.cocService.setExtractedData(coc.id, enrichedData);
        }

        this.logger.log(
          `Created CoC ${coc.id} (${cocNumber || "no batch"}) compound=${compoundCode} from ${analyzed.filename}`,
        );

        return {
          cocIds: [...acc.cocIds, coc.id],
          indexMap: new Map(acc.indexMap).set(dataIdx, coc.id),
        };
      },
      Promise.resolve({ cocIds: [] as number[], indexMap: new Map<number, number>() }),
    );

    const graphCocIds = await analysis.graphPdfs.reduce(
      async (accPromise, graphIdx) => {
        const acc = await accPromise;
        const analyzed = analysis.files[graphIdx];
        const file = files[graphIdx];

        if (analyzed.linkedToIndex !== null) {
          const linkedCocId = dataResult.indexMap.get(analyzed.linkedToIndex);
          if (linkedCocId) {
            const subPath = analyzed.companyId
              ? `au-rubber/graphs/${analyzed.companyId}`
              : "au-rubber/graphs";

            const storageResult = await this.storageService.upload(file, subPath);

            await this.cocService.updateSupplierCoc(linkedCocId, {
              graphPdfPath: storageResult.path,
            });

            this.logger.log(`Linked graph ${analyzed.filename} to CoC ${linkedCocId}`);
            return acc;
          }
        }

        const subPath = analyzed.companyId
          ? `au-rubber/cocs/${analyzed.companyId}`
          : "au-rubber/cocs/unknown";

        const storageResult = await this.storageService.upload(file, subPath);

        const coc = await this.cocService.createSupplierCoc(
          {
            cocType: analyzed.cocType || SupplierCocType.COMPOUNDER,
            supplierCompanyId: analyzed.companyId || null,
            documentPath: storageResult.path,
          },
          createdBy,
        );

        this.logger.log(`Created standalone CoC ${coc.id} for unlinked graph ${analyzed.filename}`);
        return [...acc, coc.id];
      },
      Promise.resolve([] as number[]),
    );

    return { cocIds: [...dataResult.cocIds, ...graphCocIds] };
  }

  private async detectSupplierFromPdf(pdfBuffer: Buffer, filename: string): Promise<number> {
    const pdfText = await this.extractTextFromPdf(pdfBuffer);
    const pdfTextLower = pdfText.toLowerCase();

    const companies = await this.companyRepository.find();

    if (
      pdfTextLower.includes("s&n") ||
      pdfTextLower.includes("s & n") ||
      pdfTextLower.includes("sandrubber") ||
      pdfTextLower.includes("calendered products")
    ) {
      const snCompany = companies.find(
        (c) => c.name.toLowerCase().includes("s&n") || c.name.toLowerCase().includes("s & n"),
      );
      if (snCompany) {
        this.logger.log(`Auto-detected supplier: ${snCompany.name} (from PDF content)`);
        return snCompany.id;
      }
    }

    if (
      pdfTextLower.includes("impilo") ||
      filename.toLowerCase().includes("impilo") ||
      filename.toLowerCase().startsWith("imp-")
    ) {
      const impiloCompany = companies.find((c) => c.name.toLowerCase().includes("impilo"));
      if (impiloCompany) {
        this.logger.log(`Auto-detected supplier: ${impiloCompany.name} (from PDF content)`);
        return impiloCompany.id;
      }
    }

    if (pdfTextLower.includes("au industries") || pdfTextLower.includes("au-industrie")) {
      const auCompany = companies.find((c) => c.name.toLowerCase().includes("au industrie"));
      if (auCompany) {
        this.logger.log(`Auto-detected supplier: ${auCompany.name} (from PDF content)`);
        return auCompany.id;
      }
    }

    const aiResult = await this.identifySupplierWithAi(pdfText, filename);
    if (aiResult?.companyId) {
      this.logger.log(
        `AI-detected supplier: company ${aiResult.companyId} (from AI classification)`,
      );
      return aiResult.companyId;
    }

    const firstSupplier = companies.find((c) => String(c.companyType) === "SUPPLIER");
    if (firstSupplier) {
      this.logger.warn(
        `Could not detect supplier for ${filename}, defaulting to ${firstSupplier.name}`,
      );
      return firstSupplier.id;
    }

    throw new Error(`Cannot determine supplier for file ${filename} and no suppliers exist`);
  }

  private async identifySupplierWithAi(
    pdfText: string,
    filename: string,
  ): Promise<{ cocType: SupplierCocType; companyId?: number; documentType?: string } | null> {
    const companies = await this.companyRepository.find();
    const filenameLower = filename.toLowerCase();
    const pdfTextLower = pdfText.toLowerCase();

    if (
      filenameLower.startsWith("imp-") ||
      filenameLower.includes("impilo") ||
      pdfTextLower.includes("impilo industries") ||
      pdfTextLower.includes("impilo rubber")
    ) {
      const impiloCompany = companies.find((c) => c.name.toLowerCase().includes("impilo"));
      const cocType = await this.classifyImpiloCocTypeWithAiFallback(pdfText);
      this.logger.log(`Identified as Impilo from filename/content pattern (${cocType})`);
      return {
        cocType,
        companyId: impiloCompany?.id,
      };
    }

    if (
      pdfTextLower.includes("s&n") ||
      pdfTextLower.includes("s & n") ||
      pdfTextLower.includes("sandrubber")
    ) {
      const snCompany = companies.find(
        (c) => c.name.toLowerCase().includes("s&n") || c.name.toLowerCase().includes("compounder"),
      );
      this.logger.log("Identified as S&N Rubber from content pattern");
      return {
        cocType: SupplierCocType.COMPOUNDER,
        companyId: snCompany?.id,
      };
    }

    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for supplier identification");
      return null;
    }

    const truncatedText = pdfText.length > 5000 ? pdfText.substring(0, 5000) : pdfText;

    const systemPrompt = `You are NIX, an AI assistant analyzing documents for AU Industries' rubber lining operations. Your task is to classify incoming documents and identify the supplier.

DOCUMENT TYPES:
1. SUPPLIER_COC - Certificate of Conformance from suppliers
   - COMPOUNDER CoC: From rubber compounding companies (e.g., S&N Rubber, or Impilo Industries acting as compounder). Contains batch numbers, compound codes, mixing dates, Shore A hardness, specific gravity, tensile strength, rheometer data (S-min, S-max, Ts2, Tc90). Impilo's compounder CoCs have a "BATCH CERTIFICATES" header with per-batch test results.
   - CALENDARER CoC: From rubber calendering companies (e.g., Impilo Industries acting as calenderer). Contains roll numbers, sheet specs, order/ticket numbers, calendering operations. NOTE: Impilo Industries can be EITHER a compounder or calenderer — classify based on document content, not supplier name.
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

Document content:
${truncatedText}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      this.logger.log(`NIX response for document classification: ${response.content}`);

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
          this.logger.log(
            `NIX classified as ${parsed.documentType}, supplier: ${parsed.supplierType}, confidence: ${parsed.confidence}`,
          );

          if (parsed.documentType === "SUPPLIER_COC" && parsed.supplierType) {
            const cocTypeMap: Record<string, SupplierCocType> = {
              CALENDARER: SupplierCocType.CALENDARER,
              COMPOUNDER: SupplierCocType.COMPOUNDER,
              CALENDER_ROLL: SupplierCocType.CALENDER_ROLL,
            };
            const cocType = cocTypeMap[parsed.supplierType] || SupplierCocType.COMPOUNDER;

            const companyId: number | undefined =
              cocType === SupplierCocType.CALENDARER
                ? companies.find(
                    (c) =>
                      c.name.toLowerCase().includes("impilo") ||
                      c.name.toLowerCase().includes("calendarer"),
                  )?.id
                : companies.find(
                    (c) =>
                      c.name.toLowerCase().includes("s&n") ||
                      c.name.toLowerCase().includes("compounder"),
                  )?.id;

            return { cocType, companyId, documentType: parsed.documentType };
          }

          if (parsed.documentType !== "UNKNOWN") {
            this.logger.log(
              `Document is ${parsed.documentType} - not a supplier CoC, requires manual filing`,
            );
          }
        }
      }

      this.logger.warn("NIX could not classify document");
      return null;
    } catch (error) {
      this.logger.error(`AI supplier identification failed: ${error.message}`);
      return null;
    }
  }

  private parseFilenameForCocInfo(filename: string): {
    batchNumbers: string[];
    compoundCode: string | null;
  } {
    const nameWithoutExt = filename.replace(/\.pdf$/i, "").replace(/-GRAPH$/i, "");

    const rangeMatches = [...nameWithoutExt.matchAll(/\bB(\d{1,4})-(\d{1,4})\b/gi)].map(
      (m) => `${m[1]}-${m[2]}`,
    );

    const singleMatches =
      rangeMatches.length === 0
        ? [...nameWithoutExt.matchAll(/\bB(\d{1,4})\b/gi)].map((m) => `B${m[1]}`)
        : [];

    const fallbackMatches = (() => {
      if (rangeMatches.length > 0 || singleMatches.length > 0) return [];
      const batchRangeFallback = nameWithoutExt.match(/[-\s_](\d{1,4})-(\d{1,4})$/);
      if (batchRangeFallback) return [`${batchRangeFallback[1]}-${batchRangeFallback[2]}`];
      const singleBatchMatch = nameWithoutExt.match(/[-\s_](\d{1,4})$/);
      return singleBatchMatch ? [singleBatchMatch[1]] : [];
    })();

    const batchNumbers = [...rangeMatches, ...singleMatches, ...fallbackMatches];

    const compoundPatterns = [
      /\b([A-Z]{2,4}\d{2,3}[A-Z]{2,6}\d{2,3})\b/i,
      /\b(AU[A-Z]?\d+[A-Z]+\d+)\b/i,
      /[_-]([A-Z]{3,}\d{2,}[A-Z]*\d*)[_-]/i,
    ];

    const compoundCode = compoundPatterns.reduce<string | null>((found, pattern) => {
      if (found) return found;
      const compoundMatch = nameWithoutExt.match(pattern);
      if (!compoundMatch) return null;
      const code = compoundMatch[1].toUpperCase();
      return !code.endsWith("-MDR") && !code.includes("GRAPH") ? code : null;
    }, null);

    this.logger.log(
      `Parsed filename "${filename}": batches=[${batchNumbers.join(", ")}], compoundCode=${compoundCode}`,
    );
    return { batchNumbers, compoundCode };
  }

  formatBatchRange(batchNumbers: string[]): string {
    if (batchNumbers.length === 0) return "";
    if (batchNumbers.length === 1) return batchNumbers[0];

    const numbers = batchNumbers
      .map((b) => {
        const match = b.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    if (numbers.length === 0) return batchNumbers.join(", ");

    const formatRange = (start: number, end: number) =>
      start === end ? `B${start}` : `B${start}-${end}`;

    const { ranges, start, end } = numbers.slice(1).reduce(
      (acc, num) => {
        if (num === acc.end + 1) {
          return { ranges: acc.ranges, start: acc.start, end: num };
        }
        return {
          ranges: [...acc.ranges, formatRange(acc.start, acc.end)],
          start: num,
          end: num,
        };
      },
      { ranges: [] as string[], start: numbers[0], end: numbers[0] },
    );

    return [...ranges, formatRange(start, end)].join(", ");
  }

  private extractBatchNumbersFromText(pdfText: string): string[] {
    const rangeMatches = [...pdfText.matchAll(/\b[Bb](\d{1,4})\s*[-–]\s*(\d{1,4})\b/g)].map(
      (m) => `${m[1]}-${m[2]}`,
    );

    const rangeNumbers =
      rangeMatches.length > 0
        ? rangeMatches
        : [
            ...pdfText.matchAll(
              /(?:batch|lot|no\.?|nos\.?|number)\s*[:.]?\s*(\d{1,4})\s*[-–]\s*(\d{1,4})\b/gi,
            ),
          ].map((m) => `${m[1]}-${m[2]}`);

    const singleMatches = pdfText.match(/\b[Bb]?(\d{3,4})\b/g);
    const singleNumbers: string[] = (singleMatches || [])
      .map((m) => m.replace(/^[Bb]/, ""))
      .filter((n) => {
        const num = parseInt(n, 10);
        return num >= 100 && num <= 9999;
      });

    return [...new Set([...rangeNumbers, ...singleNumbers])];
  }

  private detectIfGraph(
    pdfText: string,
    filename: string,
  ): { isGraph: boolean; batchNumbers: string[] } {
    const textLower = pdfText.toLowerCase();
    const filenameLower = filename.toLowerCase();

    this.logger.log(`Detecting if graph: filename=${filename}, textLength=${pdfText.length}`);

    const filenameIndicatesGraph =
      filenameLower.includes("graph") || filenameLower.includes("rheometer");

    if (filenameIndicatesGraph) {
      this.logger.log(`Filename indicates graph: ${filename}`);
    }

    const hasDataSheetIndicators =
      textLower.includes("shore a") ||
      textLower.includes("specific gravity") ||
      textLower.includes("tensile strength") ||
      textLower.includes("elongation") ||
      textLower.includes("tear strength") ||
      textLower.includes("rebound") ||
      textLower.includes("certificate of") ||
      textLower.includes("test report") ||
      textLower.includes("batch no") ||
      textLower.includes("compound code");

    if (hasDataSheetIndicators && !filenameIndicatesGraph) {
      this.logger.log(`Document has data sheet indicators, treating as table CoC: ${filename}`);
      return { isGraph: false, batchNumbers: [] };
    }

    const isGraph = filenameIndicatesGraph;

    if (!isGraph) {
      this.logger.log(`Not detected as graph: ${filename}`);
      return { isGraph: false, batchNumbers: [] };
    }

    const rangeMatches = [...pdfText.matchAll(/\b[Bb](\d{1,4})\s*[-–]\s*(\d{1,4})\b/g)].map(
      (m) => `${m[1]}-${m[2]}`,
    );

    const singleBatchMatches =
      rangeMatches.length === 0
        ? [...new Set(pdfText.match(/\b(\d{3})\b/g) || [])].filter(
            (b) => parseInt(b, 10) >= 100 && parseInt(b, 10) <= 999,
          )
        : [];

    const filenameBatches = (() => {
      if (rangeMatches.length > 0 || singleBatchMatches.length > 0) return [];
      const filenameInfo = this.parseFilenameForCocInfo(filename);
      this.logger.log(
        `No batch numbers from PDF content, using filename batches: ${filenameInfo.batchNumbers.join(", ")}`,
      );
      return filenameInfo.batchNumbers;
    })();

    const batchNumbers = [...rangeMatches, ...singleBatchMatches, ...filenameBatches];

    this.logger.log(`Detected graph PDF: ${filename}, batch numbers: ${batchNumbers.join(", ")}`);
    return { isGraph: true, batchNumbers };
  }

  private matchGraphByCertFilename(
    graphFilename: string,
    certRecords: Array<{
      cocId: number;
      batchNumbers: string[];
      companyId: number;
      filename: string;
    }>,
  ): { cocId: number; batchNumbers: string[]; companyId: number; filename: string } | undefined {
    const graphBase = graphFilename
      .replace(/\.pdf$/i, "")
      .replace(/[-_]?GRAPH$/i, "")
      .trim()
      .toLowerCase();

    const match = certRecords.find((cr) => {
      const certBase = cr.filename
        .replace(/\.pdf$/i, "")
        .trim()
        .toLowerCase();
      return certBase === graphBase;
    });

    if (match) {
      this.logger.log(
        `Matched graph "${graphFilename}" to cert "${match.filename}" via filename similarity`,
      );
    }

    return match;
  }

  private async linkGraphToExistingCoc(
    file: Express.Multer.File,
    pdfText: string,
    batchNumbers: string[],
  ): Promise<number | null> {
    const existingCocs = await this.cocService.allSupplierCocs();
    const cocsWithoutGraph = existingCocs.filter((coc) => !coc.graphPdfPath);

    if (batchNumbers.length > 0) {
      const batchMatch = cocsWithoutGraph.find((coc) => {
        const cocBatches = [
          ...(coc.extractedData?.batchNumbers || []),
          ...(coc.extractedData?.batches || []).map((b) => b.batchNumber),
        ];
        return batchNumbers.some((bn) =>
          cocBatches.some((cb) => cb.toLowerCase().trim() === bn.toLowerCase().trim()),
        );
      });

      if (batchMatch) {
        return this.uploadAndLinkGraph(file, batchMatch);
      }
    }

    const compoundCodeMatch = this.extractCompoundCodeFromText(pdfText);
    if (compoundCodeMatch) {
      const codeMatch = cocsWithoutGraph.find(
        (coc) =>
          coc.compoundCode?.toUpperCase() === compoundCodeMatch.toUpperCase() ||
          coc.extractedData?.compoundCode?.toUpperCase() === compoundCodeMatch.toUpperCase(),
      );

      if (codeMatch) {
        this.logger.log(
          `Graph matched to CoC ${codeMatch.id} via compound code ${compoundCodeMatch}`,
        );
        return this.uploadAndLinkGraph(file, codeMatch);
      }
    }

    return null;
  }

  private async uploadAndLinkGraph(
    file: Express.Multer.File,
    coc: { id: number; supplierCompanyId: number | null },
  ): Promise<number> {
    const subPath = coc.supplierCompanyId
      ? `au-rubber/graphs/${coc.supplierCompanyId}`
      : "au-rubber/graphs";

    const storageResult = await this.storageService.upload(file, subPath);

    await this.cocService.updateSupplierCoc(coc.id, {
      graphPdfPath: storageResult.path,
    });

    return coc.id;
  }

  private extractCompoundCodeFromText(text: string): string | null {
    const patterns = [/AUA\d{2,3}[A-Z]{2,6}/i, /[A-Z]{4}\d{2,3}/i];

    const match = patterns.reduce<string | null>(
      (found, pattern) => found ?? (text.match(pattern)?.[0]?.toUpperCase() || null),
      null,
    );

    return match;
  }

  private triggerReadinessCheckForGraphLink(cocId: number): void {
    this.auCocReadinessService.checkAndAutoGenerateForCoc(cocId).catch((error) => {
      this.logger.error(
        `Readiness check after graph link to CoC ${cocId} failed: ${error.message}`,
      );
    });
  }

  private triggerReadinessCheckForDeliveryNote(deliveryNoteId: number): void {
    this.auCocReadinessService
      .checkAndAutoGenerateForDeliveryNote(deliveryNoteId)
      .catch((error) => {
        this.logger.error(
          `Readiness check after DN ${deliveryNoteId} creation failed: ${error.message}`,
        );
      });
  }

  private autoExtractCoc(cocId: number, cocType: SupplierCocType, pdfText: string): void {
    this.cocExtractionService
      .extractByType(cocType, pdfText)
      .then(async (result) => {
        if (result?.data) {
          await this.cocService.setExtractedData(cocId, result.data);
          this.logger.log(`Auto-extracted data for CoC ${cocId} in ${result.processingTimeMs}ms`);
        }
      })
      .catch((error) => {
        this.logger.error(`Auto-extraction failed for CoC ${cocId}: ${error.message}`);
      });
  }

  parseSnCompoundCode(code: string): ParsedCompoundCode | null {
    const codeUpper = code.toUpperCase().trim();

    const pattern = /^(AU)([A-Z])(\d{2})([A-Z]{1,2})([A-Z]{2})([A-Z0-9]{2,3})$/;
    const match = codeUpper.match(pattern);

    if (!match) {
      this.logger.warn(`Could not parse S&N compound code: ${code}`);
      return null;
    }

    const [, brand, grade, shore, color, curingMethod, supplierCode] = match;

    const colorName = COLOR_MAP[color] || color;
    const curingMethodName = CURING_MAP[curingMethod] || curingMethod;

    const parsed: ParsedCompoundCode = {
      brand,
      grade,
      shoreHardness: parseInt(shore, 10),
      color,
      colorName,
      curingMethod,
      curingMethodName,
      supplierCode,
      rubberType: "SNR",
    };

    this.logger.log(
      `Parsed S&N compound code "${code}": grade=${grade}, shore=${shore}, color=${colorName}, curing=${curingMethodName}`,
    );
    return parsed;
  }

  async findOrCreateCompoundCoding(parsedCode: ParsedCompoundCode): Promise<RubberProductCoding> {
    const fullCode = `${parsedCode.brand}${parsedCode.grade}${parsedCode.shoreHardness}${parsedCode.color}${parsedCode.curingMethod}`;
    const fullName = `${parsedCode.rubberType} ${parsedCode.grade}-Grade ${parsedCode.shoreHardness} Shore ${parsedCode.colorName} ${parsedCode.curingMethodName}`;

    const existingCoding = await this.productCodingRepository.findOne({
      where: {
        codingType: ProductCodingType.COMPOUND,
        code: fullCode,
      },
    });

    if (existingCoding) {
      this.logger.log(
        `Found existing compound coding: ${existingCoding.code} - ${existingCoding.name}`,
      );
      return existingCoding;
    }

    this.logger.log(`Creating new compound coding: ${fullCode} - ${fullName}`);
    const coding = this.productCodingRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      codingType: ProductCodingType.COMPOUND,
      code: fullCode,
      name: fullName,
    });
    await this.productCodingRepository.save(coding);

    return coding;
  }

  async processCompoundCodeFromFilename(filename: string): Promise<{
    compoundCode: string | null;
    compoundCodingId: number | null;
    parsedInfo: ParsedCompoundCode | null;
  }> {
    const filenameInfo = this.parseFilenameForCocInfo(filename);

    if (!filenameInfo.compoundCode) {
      return { compoundCode: null, compoundCodingId: null, parsedInfo: null };
    }

    const parsed = this.parseSnCompoundCode(filenameInfo.compoundCode);
    if (!parsed) {
      return { compoundCode: filenameInfo.compoundCode, compoundCodingId: null, parsedInfo: null };
    }

    const coding = await this.findOrCreateCompoundCoding(parsed);

    const auCode = `${parsed.brand}${parsed.grade}${parsed.shoreHardness}${parsed.color}${parsed.curingMethod}`;

    return {
      compoundCode: auCode,
      compoundCodingId: coding.id,
      parsedInfo: parsed,
    };
  }

  async analyzeCustomerDeliveryNotes(
    files: Express.Multer.File[],
  ): Promise<AnalyzeCustomerDnsResult> {
    this.logger.log(`Analyzing ${files.length} customer delivery note files...`);
    const companies = await this.companyRepository.find();
    const customerCompanies = companies.filter((c) => c.companyType === "CUSTOMER");
    this.logger.log(`Found ${customerCompanies.length} customer companies for matching`);

    const fileResults = await files.reduce(
      async (accPromise, file, i) => {
        const acc = await accPromise;
        this.logger.log(
          `Analyzing customer DN file ${i + 1}/${files.length}: ${file.originalname}`,
        );

        const { deliveryNotesFromFile, podPagesFromFile, newErrors } = await (async (): Promise<{
          deliveryNotesFromFile: Array<Record<string, unknown>>;
          podPagesFromFile: Array<{ pageNumber: number; relatedDnNumber: string | null }>;
          newErrors: string[];
        }> => {
          try {
            const isAvailable = await this.cocExtractionService.isAvailable();
            if (!isAvailable) {
              throw new Error("GEMINI_API_KEY not configured - AI extraction unavailable");
            }

            this.logger.log(`Using OCR-based extraction for ${file.originalname}`);
            const extraction =
              await this.cocExtractionService.extractCustomerDeliveryNoteFromImages(file.buffer);
            const allNotes = extraction.deliveryNotes as Array<Record<string, unknown>>;

            const cdnNotes = allNotes.filter((note) => {
              const supplier = ((note.supplierName as string) || "").toLowerCase();
              const isSupplierDn =
                supplier.includes("s&n") ||
                supplier.includes("s & n") ||
                supplier.includes("impilo") ||
                supplier.includes("calendered products");
              if (isSupplierDn) {
                this.logger.log(
                  `[CustomerDN] Filtering out supplier DN "${note.deliveryNoteNumber}" (supplier: ${note.supplierName}) from customer analysis`,
                );
              }
              return !isSupplierDn;
            });

            this.logger.log(
              `Extracted ${allNotes.length} DN(s) from ${file.originalname}, kept ${cdnNotes.length} customer DN(s) (filtered ${allNotes.length - cdnNotes.length} supplier DN(s)), ${extraction.podPages.length} POD page(s)`,
            );
            return {
              deliveryNotesFromFile: cdnNotes.length > 0 ? cdnNotes : [{}],
              podPagesFromFile: extraction.podPages,
              newErrors: [],
            };
          } catch (error) {
            const errorMsg = `Failed to extract from ${file.originalname}: ${error.message}`;
            this.logger.error(errorMsg);
            return { deliveryNotesFromFile: [{}], podPagesFromFile: [], newErrors: [errorMsg] };
          }
        })();

        const dnFiles = deliveryNotesFromFile.map((extractedData, dnIndex) => {
          const customerName = (extractedData.customerName as string) || null;
          const customerReference = (extractedData.customerReference as string) || null;
          this.logger.log(
            `[CustomerDN] Extracted DN #${dnIndex + 1}: number=${extractedData.deliveryNoteNumber}, ref=${customerReference}, customer=${customerName}`,
          );

          const matchedCompany = customerName
            ? this.matchCustomerByName(customerName, customerCompanies)
            : null;
          const customerId: number | null = matchedCompany?.id ?? null;
          const newUnmatched: string[] = (() => {
            if (!customerName) return [];
            if (matchedCompany) {
              this.logger.log(
                `Matched customer "${customerName}" to company ${matchedCompany.name} (ID: ${matchedCompany.id})`,
              );
              return [];
            } else {
              this.logger.warn(
                `Could not match customer "${customerName}" to any existing company`,
              );
              return [customerName];
            }
          })();

          const lineItems = ((extractedData.lineItems as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              lineNumber: (item.lineNumber as number) || null,
              compoundType:
                (item.compoundCode as string) ||
                (item.compoundType as string) ||
                (item.compoundDescription as string) ||
                null,
              thicknessMm: (item.thicknessMm as number) || null,
              widthMm: (item.widthMm as number) || null,
              lengthM: (item.lengthM as number) || null,
              quantity: (item.quantity as number) || null,
              rollWeightKg:
                (item.actualWeightKg as number) ||
                (item.rollWeightKg as number) ||
                (item.weightPerRollKg as number) ||
                null,
              cocBatchNumbers: (item.cocBatchNumbers as string[]) || null,
              rollNumber: (item.rollNumber as string) || null,
              specificGravity: (item.specificGravity as number) || null,
            }),
          );

          const pageInfo = extractedData.pageInfo as {
            currentPage?: number;
            totalPages?: number;
          } | null;

          const sourcePages = (extractedData.sourcePages as number[]) || null;

          const filenameWithIndex =
            deliveryNotesFromFile.length > 1
              ? `${file.originalname} (DN ${dnIndex + 1}/${deliveryNotesFromFile.length})`
              : file.originalname;

          return {
            file: {
              filename: filenameWithIndex,
              originalFileIndex: i,
              deliveryNoteNumber: (extractedData.deliveryNoteNumber as string) || null,
              customerReference: (extractedData.customerReference as string) || null,
              deliveryDate: (extractedData.deliveryDate as string) || null,
              customerName,
              customerId,
              pageInfo: pageInfo
                ? {
                    currentPage: pageInfo.currentPage || null,
                    totalPages: pageInfo.totalPages || null,
                  }
                : null,
              sourcePages,
              lineItems,
              pdfText: "",
            },
            unmatched: newUnmatched,
          };
        });

        return {
          analyzedFiles: [...acc.analyzedFiles, ...dnFiles.map((d) => d.file)],
          unmatchedCustomerNames: [
            ...new Set([...acc.unmatchedCustomerNames, ...dnFiles.flatMap((d) => d.unmatched)]),
          ],
          extractionErrors: [...acc.extractionErrors, ...newErrors],
          allPodPages: [...acc.allPodPages, ...podPagesFromFile],
        };
      },
      Promise.resolve({
        analyzedFiles: [] as AnalyzedCustomerDnFile[],
        unmatchedCustomerNames: [] as string[],
        extractionErrors: [] as string[],
        allPodPages: [] as Array<{ pageNumber: number; relatedDnNumber: string | null }>,
      }),
    );

    const { analyzedFiles, unmatchedCustomerNames, extractionErrors, allPodPages } = fileResults;

    const groups = this.groupCustomerDnsByNumber(analyzedFiles);

    const podPagesByDn = this.resolvePodPageNumbersByOrder(
      allPodPages,
      analyzedFiles
        .filter((f) => f.deliveryNoteNumber)
        .map((f) => ({
          deliveryNoteNumber: f.deliveryNoteNumber,
          sourcePages: f.sourcePages || undefined,
        })),
    );

    const groupsWithPods = groups.map((group) => ({
      ...group,
      podPageNumbers: podPagesByDn[group.deliveryNoteNumber] || [],
    }));

    const dnNumbersWithCustomers = groupsWithPods
      .filter((g) => g.deliveryNoteNumber && g.customerId)
      .map((g) => ({ number: g.deliveryNoteNumber, customerId: g.customerId! }));

    const existingChecks = await Promise.all(
      dnNumbersWithCustomers.map(async ({ number: dnNumber, customerId }) => {
        const existing = await this.deliveryNoteService.findByDnNumberAndCompany(
          dnNumber,
          customerId,
        );
        return existing ? dnNumber : null;
      }),
    );
    const existingDnNumbers = existingChecks.filter((dn): dn is string => dn !== null);

    this.logger.log(
      `Analysis complete: ${analyzedFiles.length} files, ${groupsWithPods.length} groups, ${extractionErrors.length} errors, ${existingDnNumbers.length} existing DNs, ${allPodPages.length} POD pages`,
    );

    if (extractionErrors.length > 0) {
      this.logger.warn(`Extraction errors: ${extractionErrors.join("; ")}`);
    }

    return {
      files: analyzedFiles,
      groups: groupsWithPods,
      unmatchedCustomerNames,
      existingDnNumbers,
    };
  }

  private matchCustomerByName(
    customerName: string,
    customerCompanies: RubberCompany[],
  ): RubberCompany | null {
    const nameLower = customerName.toLowerCase().trim();

    const exactMatch = customerCompanies.find((c) => c.name.toLowerCase() === nameLower);
    if (exactMatch) return exactMatch;

    const containsMatch = customerCompanies.find(
      (c) => c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase()),
    );
    if (containsMatch) return containsMatch;

    const words = nameLower.split(/\s+/).filter((w) => w.length > 2);
    const partialMatch = customerCompanies.find((c) => {
      const companyWords = c.name.toLowerCase().split(/\s+/);
      return words.some((w) => companyWords.some((cw) => cw.includes(w) || w.includes(cw)));
    });

    return partialMatch || null;
  }

  private groupCustomerDnsByNumber(files: AnalyzedCustomerDnFile[]): CustomerDnGroup[] {
    const groupMap = files.reduce((map, file) => {
      const dnNumber =
        file.deliveryNoteNumber ||
        (() => {
          const filenameMatch = file.filename.match(/DN[-_]?(\d+)/i);
          if (filenameMatch) {
            this.logger.log(`Extracted DN number from filename: DN${filenameMatch[1]}`);
            return `DN${filenameMatch[1]}`;
          }
          return file.filename.replace(/\.[^/.]+$/, "");
        })();

      const existing = map.get(dnNumber);
      const fileEntry = {
        fileIndex: file.originalFileIndex,
        filename: file.filename,
        pageNumber: file.pageInfo?.currentPage || null,
      };

      if (!existing) {
        return new Map(map).set(dnNumber, {
          deliveryNoteNumber: dnNumber,
          customerReference: file.customerReference,
          deliveryDate: file.deliveryDate,
          customerId: file.customerId,
          customerName: file.customerName,
          files: [fileEntry],
          allLineItems: [...file.lineItems],
        });
      }

      return new Map(map).set(dnNumber, {
        ...existing,
        files: [...existing.files, fileEntry],
        allLineItems: [...existing.allLineItems, ...file.lineItems],
        customerReference: existing.customerReference || file.customerReference,
        deliveryDate: existing.deliveryDate || file.deliveryDate,
        customerId: existing.customerId || file.customerId,
        customerName: existing.customerId
          ? existing.customerName
          : file.customerId
            ? file.customerName
            : existing.customerName,
      });
    }, new Map<string, CustomerDnGroup>());

    return Array.from(groupMap.values()).map((group) => ({
      ...group,
      files: [...group.files].sort((a, b) => {
        if (a.pageNumber !== null && b.pageNumber !== null) {
          return a.pageNumber - b.pageNumber;
        }
        return a.fileIndex - b.fileIndex;
      }),
    }));
  }

  private resolvePodPageNumbersByOrder(
    podPages: Array<{ pageNumber: number; relatedDnNumber: string | null }>,
    deliveryNotes: Array<{ deliveryNoteNumber?: string | null; sourcePages?: number[] }>,
  ): Record<string, number[]> {
    if (!podPages || podPages.length === 0) return {};

    const dnOrder = deliveryNotes
      .map((dn, idx) => ({
        dnNumber: dn.deliveryNoteNumber,
        maxPage:
          dn.sourcePages && dn.sourcePages.length > 0 ? Math.max(...dn.sourcePages) : idx + 1,
      }))
      .filter((entry) => entry.dnNumber !== null);

    return podPages.reduce(
      (result, pod) => {
        const targetDn = pod.relatedDnNumber
          ? dnOrder.find((dn) => dn.dnNumber === pod.relatedDnNumber)?.dnNumber
          : dnOrder
              .filter((dn) => dn.maxPage < pod.pageNumber)
              .sort((a, b) => b.maxPage - a.maxPage)[0]?.dnNumber;

        if (!targetDn) return result;

        return {
          ...result,
          [targetDn]: [...(result[targetDn] || []), pod.pageNumber],
        };
      },
      {} as Record<string, number[]>,
    );
  }

  async createCustomerDnsFromAnalysis(
    files: Express.Multer.File[],
    analysis: AnalyzeCustomerDnsResult,
    overrides: Array<{
      deliveryNoteNumber?: string;
      customerId?: number;
      customerReference?: string;
      deliveryDate?: string;
    }>,
    createdBy?: string,
  ): Promise<{ deliveryNoteIds: number[] }> {
    this.logger.log(
      `Starting creation of ${analysis.groups.length} customer DNs from ${files.length} files`,
    );

    const { deliveryNoteIds, errors } = await analysis.groups.reduce(
      async (accPromise, group, groupIdx) => {
        const acc = await accPromise;
        const override = overrides[groupIdx] || {};

        this.logger.log(
          `Processing group ${groupIdx + 1}/${analysis.groups.length}: DN ${group.deliveryNoteNumber}`,
        );

        try {
          const customerId = override.customerId || group.customerId;
          if (!customerId) {
            this.logger.warn(`Skipping group ${group.deliveryNoteNumber}: no customer ID`);
            return {
              ...acc,
              errors: [...acc.errors, `Group ${group.deliveryNoteNumber}: no customer ID`],
            };
          }

          const deliveryNoteNumber = override.deliveryNoteNumber || group.deliveryNoteNumber;
          const customerReference = override.customerReference || group.customerReference;
          const deliveryDate = override.deliveryDate || group.deliveryDate;

          const groupFiles = group.files.map((f) => files[f.fileIndex]);
          const firstFile = groupFiles[0];
          if (!firstFile) {
            this.logger.warn(`Skipping group ${deliveryNoteNumber}: no file available`);
            return {
              ...acc,
              errors: [...acc.errors, `Group ${deliveryNoteNumber}: no file available`],
            };
          }

          const subPath = `au-rubber/customer-delivery-notes/${customerId}`;
          this.logger.log(`Uploading file for DN ${deliveryNoteNumber} to ${subPath}`);
          const storageResult = await this.storageService.upload(firstFile, subPath);
          this.logger.log(`File uploaded to ${storageResult.path}`);

          const existingDn = await this.deliveryNoteService.findByDnNumberAndCompany(
            deliveryNoteNumber,
            customerId,
          );

          const dnId: number = await (async () => {
            if (existingDn) {
              this.logger.log(
                `Found existing DN ${existingDn.id} for ${deliveryNoteNumber} - overwriting`,
              );
              await this.deliveryNoteService.updateDeliveryNote(existingDn.id, {
                deliveryNoteNumber,
                deliveryDate: deliveryDate || null,
                status: DeliveryNoteStatus.PENDING,
              });
              await this.deliveryNoteService.updateDocumentPath(existingDn.id, storageResult.path);
              await this.deliveryNoteService.replaceDeliveryNoteItems(existingDn.id);
              return existingDn.id;
            } else {
              const dn = await this.deliveryNoteService.createDeliveryNote(
                {
                  deliveryNoteType: DeliveryNoteType.ROLL,
                  supplierCompanyId: customerId,
                  documentPath: storageResult.path,
                  deliveryNoteNumber,
                  deliveryDate: deliveryDate || null,
                  customerReference: customerReference || null,
                },
                createdBy,
              );
              return dn.id;
            }
          })();

          await group.allLineItems.reduce(async (itemPromise, lineItem) => {
            await itemPromise;
            await this.deliveryNoteService.createDeliveryNoteItem({
              deliveryNoteId: dnId,
              compoundType: lineItem.compoundType,
              thicknessMm: lineItem.thicknessMm,
              widthMm: lineItem.widthMm,
              lengthM: lineItem.lengthM,
              quantity: lineItem.quantity,
              rollWeightKg: lineItem.rollWeightKg,
              rollNumber: lineItem.rollNumber,
              cocBatchNumbers: lineItem.cocBatchNumbers,
            });
          }, Promise.resolve());

          const podPageNumbers = (group as unknown as { podPageNumbers?: number[] }).podPageNumbers;
          if (podPageNumbers && podPageNumbers.length > 0) {
            await this.deliveryNoteService.setPodPageNumbers(dnId, podPageNumbers);
            this.logger.log(
              `Stored ${podPageNumbers.length} POD page number(s) for DN ${dnId}: [${podPageNumbers.join(", ")}]`,
            );
          }

          this.logger.log(
            `${existingDn ? "Overwrote" : "Created"} customer DN ${dnId} (${deliveryNoteNumber}) with ${group.allLineItems.length} line items`,
          );

          this.triggerReadinessCheckForDeliveryNote(dnId);

          return { ...acc, deliveryNoteIds: [...acc.deliveryNoteIds, dnId] };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to create DN for group ${groupIdx + 1} (${group.deliveryNoteNumber}): ${errorMsg}`,
          );
          return {
            ...acc,
            errors: [...acc.errors, `Group ${group.deliveryNoteNumber}: ${errorMsg}`],
          };
        }
      },
      Promise.resolve({ deliveryNoteIds: [] as number[], errors: [] as string[] }),
    );

    this.logger.log(
      `Completed DN creation: ${deliveryNoteIds.length} created, ${errors.length} errors`,
    );
    if (errors.length > 0) {
      this.logger.warn(`DN creation errors: ${errors.join("; ")}`);
    }

    return { deliveryNoteIds };
  }
}
