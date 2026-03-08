import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateUniqueId } from "../lib/datetime";
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
      result.errors.push("No PDF, Excel, or Word attachments found in email");
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
    const classified: Array<{
      attachment: InboundEmailAttachment;
      pdfText: string;
      isGraph: boolean;
      batchNumbers: string[];
      supplierMapping: SupplierMapping | null;
    }> = [];

    for (const attachment of attachments) {
      try {
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

        classified.push({
          attachment,
          pdfText,
          isGraph: graphResult.isGraph,
          batchNumbers: graphResult.isGraph
            ? graphResult.batchNumbers
            : this.extractBatchNumbersFromText(pdfText),
          supplierMapping,
        });
      } catch (error) {
        const errorMsg = `Failed to classify attachment ${attachment.filename}: ${error.message}`;
        result.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }

    const certs = classified.filter((c) => !c.isGraph);
    const graphs = classified.filter((c) => c.isGraph);

    const certRecords: Array<{ cocId: number; batchNumbers: string[]; companyId: number }> = [];

    for (const cert of certs) {
      try {
        if (!cert.supplierMapping) {
          const errorMsg = `Could not identify supplier for attachment: ${cert.attachment.filename}`;
          result.errors.push(errorMsg);
          this.logger.warn(errorMsg);
          continue;
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
            continue;
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
        result.cocIds.push(coc.id);
        certRecords.push({
          cocId: coc.id,
          batchNumbers: cert.batchNumbers,
          companyId: cert.supplierMapping.company.id,
        });
        this.logger.log(`Created Supplier CoC ${coc.id} from email attachment`);

        this.autoExtractCoc(coc.id, cert.supplierMapping.cocType, cert.pdfText);
      } catch (error) {
        const errorMsg = `Failed to process cert attachment ${cert.attachment.filename}: ${error.message}`;
        result.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }

    for (const graph of graphs) {
      try {
        const normalizedGraphBatches = graph.batchNumbers.map((b) => b.replace(/^[Bb]/, ""));

        const matchingCert = certRecords.find((cert) =>
          normalizedGraphBatches.some((gb) => cert.batchNumbers.includes(gb)),
        );

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
        result.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }
  }

  private async processNonCocAttachments(
    attachments: InboundEmailAttachment[],
    emailData: InboundEmailData,
    documentType: "delivery_note" | "tax_invoice",
    result: ProcessedEmailResult,
  ): Promise<void> {
    for (const attachment of attachments) {
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
          result.errors.push(errorMsg);
          this.logger.warn(errorMsg);
          continue;
        }

        this.logger.log(
          `Identified supplier from document: ${supplierMapping.company.name} (${supplierMapping.cocType})`,
        );

        const storageResult = await this.saveAttachment(
          attachment,
          supplierMapping.company.id,
          documentType,
        );

        if (documentType === "tax_invoice") {
          const invoiceNumber = `INV-${Date.now()}`;
          const invoice = await this.taxInvoiceService.createTaxInvoice(
            {
              invoiceNumber,
              invoiceType: TaxInvoiceType.SUPPLIER,
              companyId: supplierMapping.company.id,
              documentPath: storageResult.path,
            },
            `inbound-email:${emailData.from}`,
          );
          result.taxInvoiceIds.push(invoice.id);
          this.logger.log(`Created Tax Invoice ${invoice.id} from email attachment`);

          try {
            const isPdf =
              attachment.contentType === "application/pdf" ||
              attachment.filename?.toLowerCase().endsWith(".pdf");

            if (isPdf) {
              const pdfText = await this.extractTextFromPdf(attachment.content);
              if (pdfText.length >= 50) {
                const extractionResult = await this.cocExtractionService.extractTaxInvoice(pdfText);
                await this.taxInvoiceService.setExtractedData(invoice.id, extractionResult.data);
                this.logger.log(
                  `Auto-extracted Tax Invoice ${invoice.id} in ${extractionResult.processingTimeMs}ms`,
                );
              } else {
                this.logger.log(
                  `Tax Invoice ${invoice.id} PDF text too short (${pdfText.length} chars), falling back to OCR`,
                );
                const extractionResult =
                  await this.cocExtractionService.extractTaxInvoiceFromImages(attachment.content);
                await this.taxInvoiceService.setExtractedData(invoice.id, extractionResult.data);
                this.logger.log(
                  `Auto-extracted Tax Invoice ${invoice.id} via OCR in ${extractionResult.processingTimeMs}ms`,
                );
              }
            } else {
              const extractionResult =
                await this.cocExtractionService.extractTaxInvoice(documentText);
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
          const generatedDnNumber = `DN-${Date.now()}`;
          const dn = await this.deliveryNoteService.createDeliveryNote(
            {
              deliveryNoteType: supplierMapping.deliveryNoteType,
              supplierCompanyId: supplierMapping.company.id,
              documentPath: storageResult.path,
              deliveryNoteNumber: generatedDnNumber,
            },
            `inbound-email:${emailData.from}`,
          );
          result.deliveryNoteIds.push(dn.id);
          this.logger.log(`Created Delivery Note ${dn.id} from email attachment`);
        }
      } catch (error) {
        const errorMsg = `Failed to process attachment ${attachment.filename}: ${error.message}`;
        result.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }
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
      const calendarerCompany = companies.find(
        (c) =>
          c.name.toLowerCase().includes("impilo") || c.name.toLowerCase().includes("calendarer"),
      );
      if (calendarerCompany) {
        this.logger.log(`Identified supplier from document content: ${calendarerCompany.name}`);
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
        this.logger.log(`Identified supplier from document content: ${compounderCompany.name}`);
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
        this.logger.log(`Identified supplier from filename: ${calendarerCompany.name}`);
        return {
          company: calendarerCompany,
          cocType: SupplierCocType.CALENDARER,
          deliveryNoteType: DeliveryNoteType.ROLL,
        };
      }
    }

    for (const company of companies) {
      const companyNameLower = company.name.toLowerCase();

      if (companyNameLower.includes("impilo") || companyNameLower.includes("calendarer")) {
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

      if (companyNameLower.includes("s&n") || companyNameLower.includes("compounder")) {
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
      subjectLower.includes("dn") ||
      subjectLower.includes("despatch") ||
      subjectLower.includes("dispatch")
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

    const taxInvoiceKeywords = [
      "tax invoice",
      "invoice number",
      "invoice date",
      "payment terms",
      "amount due",
    ];
    const deliveryNoteKeywords = [
      "delivery note",
      "goods received",
      "dispatch note",
      "packing slip",
    ];

    if (taxInvoiceKeywords.some((kw) => textLower.includes(kw))) {
      this.logger.log(`Rule-based classification: tax_invoice (file: ${filename})`);
      return "tax_invoice";
    }

    if (deliveryNoteKeywords.some((kw) => textLower.includes(kw))) {
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
    documentType: "supplier_coc" | "delivery_note",
    metadata: {
      supplierCompanyId?: number;
      cocType?: SupplierCocType;
      deliveryNoteType?: DeliveryNoteType;
      cocNumber?: string;
      compoundCode?: string;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
    },
    createdBy?: string,
  ): Promise<{ cocIds?: number[]; deliveryNoteIds?: number[] }> {
    const result: { cocIds?: number[]; deliveryNoteIds?: number[] } = {};

    if (documentType === "supplier_coc") {
      result.cocIds = [];

      for (const file of files) {
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
            result.cocIds.push(linkedCocId);
            continue;
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

        result.cocIds.push(coc.id);

        this.autoExtractCoc(coc.id, detectedCocType, pdfText);
      }
    } else {
      result.deliveryNoteIds = [];
      const subPath = `au-rubber/delivery-notes/${metadata.supplierCompanyId || "unknown"}`;

      for (const file of files) {
        const storageResult = await this.storageService.upload(file, subPath);

        const dnNumber = metadata.deliveryNoteNumber || `DN-${Date.now()}`;
        const dn = await this.deliveryNoteService.createDeliveryNote(
          {
            deliveryNoteType: metadata.deliveryNoteType || DeliveryNoteType.COMPOUND,
            supplierCompanyId: metadata.supplierCompanyId as number,
            documentPath: storageResult.path,
            deliveryNoteNumber: dnNumber,
            deliveryDate: metadata.deliveryDate,
          },
          createdBy,
        );

        result.deliveryNoteIds.push(dn.id);
      }
    }

    return result;
  }

  async analyzeFiles(files: Express.Multer.File[]): Promise<AnalyzeFilesResult> {
    this.logger.log(`Analyzing ${files.length} files for CoC data...`);
    const companies = await this.companyRepository.find();

    const analyzedFiles: AnalyzedFile[] = [];
    const dataPdfs: number[] = [];
    const graphPdfs: number[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.logger.log(`Analyzing file ${i + 1}/${files.length}: ${file.originalname}`);

      const pdfText = await this.extractTextFromPdf(file.buffer);
      this.logger.log(`Extracted ${pdfText.length} characters from ${file.originalname}`);

      const graphInfo = this.detectIfGraph(pdfText, file.originalname);
      this.logger.log(
        `Graph detection for ${file.originalname}: isGraph=${graphInfo.isGraph}, batchNumbers=${graphInfo.batchNumbers.join(",")}`,
      );

      if (graphInfo.isGraph) {
        graphPdfs.push(i);
        analyzedFiles.push({
          filename: file.originalname,
          isGraph: true,
          cocType: null,
          companyId: null,
          companyName: null,
          extractedData: null,
          batchNumbers: graphInfo.batchNumbers,
          linkedToIndex: null,
          pdfText,
        });
      } else {
        dataPdfs.push(i);

        const filenameInfo = this.parseFilenameForCocInfo(file.originalname);

        const supplierInfo = await this.identifySupplierWithAi(pdfText, file.originalname);
        const cocType = supplierInfo?.cocType || SupplierCocType.COMPOUNDER;
        const companyId = supplierInfo?.companyId || null;
        const company = companyId ? companies.find((c) => c.id === companyId) : null;

        let extractedData: Record<string, unknown> | null = null;
        try {
          const extraction = await this.cocExtractionService.extractByType(cocType, pdfText);
          extractedData = extraction.data as Record<string, unknown>;
          this.logger.log(
            `Extracted data for ${file.originalname}: ${JSON.stringify(extractedData).substring(0, 200)}`,
          );
        } catch (error) {
          this.logger.error(`Failed to extract data from ${file.originalname}: ${error.message}`);
        }

        const batchNumbersFromExtraction = (extractedData?.batchNumbers as string[]) || [];
        const batchNumbers =
          filenameInfo.batchNumbers.length > 0
            ? filenameInfo.batchNumbers
            : batchNumbersFromExtraction;

        const compoundCodeFromFilename = filenameInfo.compoundCode;
        if (compoundCodeFromFilename && extractedData) {
          extractedData.compoundCode = compoundCodeFromFilename;
        }

        analyzedFiles.push({
          filename: file.originalname,
          isGraph: false,
          cocType,
          companyId,
          companyName: company?.name || null,
          extractedData,
          batchNumbers,
          linkedToIndex: null,
          pdfText,
        });
      }
    }

    for (const graphIdx of graphPdfs) {
      const graphFile = analyzedFiles[graphIdx];
      if (graphFile.batchNumbers.length === 0) {
        continue;
      }

      for (const dataIdx of dataPdfs) {
        const dataFile = analyzedFiles[dataIdx];
        const normalizedGraphBatches = graphFile.batchNumbers.map((b) => b.replace(/^B/i, ""));
        const normalizedDataBatches = dataFile.batchNumbers.map((b) => b.replace(/^B/i, ""));
        const hasMatchingBatch = normalizedGraphBatches.some((gbn) =>
          normalizedDataBatches.includes(gbn),
        );

        if (hasMatchingBatch) {
          graphFile.linkedToIndex = dataIdx;
          graphFile.cocType = dataFile.cocType;
          graphFile.companyId = dataFile.companyId;
          graphFile.companyName = dataFile.companyName;
          this.logger.log(
            `Linked graph ${graphFile.filename} to data PDF ${dataFile.filename} via batch numbers`,
          );
          break;
        }
      }
    }

    return { files: analyzedFiles, dataPdfs, graphPdfs };
  }

  async createCocsFromAnalysis(
    files: Express.Multer.File[],
    analysis: AnalyzeFilesResult,
    createdBy?: string,
  ): Promise<{ cocIds: number[] }> {
    const cocIds: number[] = [];
    const createdCocsByIndex: Map<number, number> = new Map();

    for (const dataIdx of analysis.dataPdfs) {
      const analyzed = analysis.files[dataIdx];
      const file = files[dataIdx];

      const filenameInfo = this.parseFilenameForCocInfo(file.originalname);
      const compoundInfo = await this.processCompoundCodeFromFilename(file.originalname);

      const batchNumbers =
        filenameInfo.batchNumbers.length > 0 ? filenameInfo.batchNumbers : analyzed.batchNumbers;
      const cocNumber = batchNumbers.length > 0 ? this.formatBatchRange(batchNumbers) : undefined;

      const compoundCode =
        compoundInfo.compoundCode || (analyzed.extractedData?.compoundCode as string) || undefined;

      const subPath = analyzed.companyId
        ? `au-rubber/cocs/${analyzed.companyId}`
        : `au-rubber/cocs/${(analyzed.cocType || "compounder").toLowerCase()}`;

      const storageResult = await this.storageService.upload(file, subPath);

      const coc = await this.cocService.createSupplierCoc(
        {
          cocType: analyzed.cocType || SupplierCocType.COMPOUNDER,
          supplierCompanyId: analyzed.companyId || undefined,
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

      cocIds.push(coc.id);
      createdCocsByIndex.set(dataIdx, coc.id);
      this.logger.log(
        `Created CoC ${coc.id} (${cocNumber || "no batch"}) compound=${compoundCode} from ${analyzed.filename}`,
      );
    }

    for (const graphIdx of analysis.graphPdfs) {
      const analyzed = analysis.files[graphIdx];
      const file = files[graphIdx];

      if (analyzed.linkedToIndex !== null) {
        const linkedCocId = createdCocsByIndex.get(analyzed.linkedToIndex);
        if (linkedCocId) {
          const subPath = analyzed.companyId
            ? `au-rubber/graphs/${analyzed.companyId}`
            : "au-rubber/graphs";

          const storageResult = await this.storageService.upload(file, subPath);

          await this.cocService.updateSupplierCoc(linkedCocId, {
            graphPdfPath: storageResult.path,
          });

          this.logger.log(`Linked graph ${analyzed.filename} to CoC ${linkedCocId}`);
          continue;
        }
      }

      const subPath = analyzed.companyId
        ? `au-rubber/cocs/${analyzed.companyId}`
        : "au-rubber/cocs/unknown";

      const storageResult = await this.storageService.upload(file, subPath);

      const coc = await this.cocService.createSupplierCoc(
        {
          cocType: analyzed.cocType || SupplierCocType.COMPOUNDER,
          supplierCompanyId: analyzed.companyId || undefined,
          documentPath: storageResult.path,
        },
        createdBy,
      );

      cocIds.push(coc.id);
      this.logger.log(`Created standalone CoC ${coc.id} for unlinked graph ${analyzed.filename}`);
    }

    return { cocIds };
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
      this.logger.log("Identified as Impilo from filename/content pattern");
      return {
        cocType: SupplierCocType.CALENDARER,
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
   - COMPOUNDER CoC: From rubber compounding companies (e.g., S&N Rubber). Contains batch numbers, compound codes, mixing dates, Shore A hardness, specific gravity, tensile strength, rheometer data (S-min, S-max, Ts2, Tc90)
   - CALENDARER CoC: From rubber calendering companies (e.g., Impilo Industries). Contains roll numbers, sheet specs, order/ticket numbers, calendering operations

2. DELIVERY_NOTE - Goods received documentation
   - Contains delivery date, quantities, item descriptions, supplier details

3. PURCHASE_ORDER - Orders placed by AU Industries
   - Contains PO number, line items, quantities, pricing

4. INVOICE - Supplier invoices for payment
   - Contains invoice number, line items, amounts, payment terms

5. QUOTE - Supplier quotations
   - Contains quoted prices, quantities, validity period

6. UNKNOWN - Cannot confidently classify the document

For SUPPLIER_COC documents, also identify the supplier type (COMPOUNDER or CALENDARER).

Respond ONLY with a JSON object:
{"documentType": "SUPPLIER_COC"|"DELIVERY_NOTE"|"PURCHASE_ORDER"|"INVOICE"|"QUOTE"|"UNKNOWN", "supplierType": "COMPOUNDER"|"CALENDARER"|null, "confidence": 0.0-1.0, "reason": "brief explanation"}`;

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
            const cocType =
              parsed.supplierType === "CALENDARER"
                ? SupplierCocType.CALENDARER
                : SupplierCocType.COMPOUNDER;

            let companyId: number | undefined;
            if (cocType === SupplierCocType.CALENDARER) {
              const calendarerCompany = companies.find(
                (c) =>
                  c.name.toLowerCase().includes("impilo") ||
                  c.name.toLowerCase().includes("calendarer"),
              );
              companyId = calendarerCompany?.id;
            } else {
              const compounderCompany = companies.find(
                (c) =>
                  c.name.toLowerCase().includes("s&n") ||
                  c.name.toLowerCase().includes("compounder"),
              );
              companyId = compounderCompany?.id;
            }

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
    const batchNumbers: string[] = [];
    let compoundCode: string | null = null;

    const batchPattern = /\bB(\d{3,4})\b/gi;
    let match;
    while ((match = batchPattern.exec(nameWithoutExt)) !== null) {
      batchNumbers.push(`B${match[1]}`);
    }

    if (batchNumbers.length === 0) {
      const batchRangeMatch = nameWithoutExt.match(/[\s_](\d{1,4})-(\d{1,4})$/);
      if (batchRangeMatch) {
        batchNumbers.push(`${batchRangeMatch[1]}-${batchRangeMatch[2]}`);
      } else {
        const singleBatchMatch = nameWithoutExt.match(/[\s_](\d{1,4})$/);
        if (singleBatchMatch) {
          batchNumbers.push(singleBatchMatch[1]);
        }
      }
    }

    const compoundPatterns = [
      /\b([A-Z]{2,4}\d{2,3}[A-Z]{2,6}\d{2,3})\b/i,
      /\b(AU[A-Z]?\d+[A-Z]+\d+)\b/i,
      /[_-]([A-Z]{3,}\d{2,}[A-Z]*\d*)[_-]/i,
    ];

    for (const pattern of compoundPatterns) {
      const compoundMatch = nameWithoutExt.match(pattern);
      if (compoundMatch) {
        compoundCode = compoundMatch[1].toUpperCase();
        if (!compoundCode.endsWith("-MDR") && !compoundCode.includes("GRAPH")) {
          break;
        }
        compoundCode = null;
      }
    }

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

    const ranges: string[] = [];
    let rangeStart = numbers[0];
    let rangeEnd = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === rangeEnd + 1) {
        rangeEnd = numbers[i];
      } else {
        ranges.push(rangeStart === rangeEnd ? `B${rangeStart}` : `B${rangeStart}-${rangeEnd}`);
        rangeStart = numbers[i];
        rangeEnd = numbers[i];
      }
    }

    ranges.push(rangeStart === rangeEnd ? `B${rangeStart}` : `B${rangeStart}-${rangeEnd}`);

    return ranges.join(", ");
  }

  private extractBatchNumbersFromText(pdfText: string): string[] {
    const matches = pdfText.match(/\b[Bb]?(\d{3,4})\b/g);
    if (!matches) {
      return [];
    }
    return [
      ...new Set(
        matches
          .map((m) => m.replace(/^[Bb]/, ""))
          .filter((n) => {
            const num = parseInt(n, 10);
            return num >= 100 && num <= 9999;
          }),
      ),
    ];
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
      this.logger.log(`Document has data sheet indicators, not a graph: ${filename}`);
      return { isGraph: false, batchNumbers: [] };
    }

    const isGraph = filenameIndicatesGraph;

    if (!isGraph) {
      this.logger.log(`Not detected as graph: ${filename}`);
      return { isGraph: false, batchNumbers: [] };
    }

    const batchNumbers: string[] = [];
    const batchMatches = pdfText.match(/\b(\d{3})\b/g);
    if (batchMatches) {
      const uniqueBatches = [...new Set(batchMatches)].filter(
        (b) => parseInt(b, 10) >= 100 && parseInt(b, 10) <= 999,
      );
      batchNumbers.push(...uniqueBatches);
    }

    if (batchNumbers.length === 0) {
      const filenameInfo = this.parseFilenameForCocInfo(filename);
      batchNumbers.push(...filenameInfo.batchNumbers);
      this.logger.log(
        `No batch numbers from PDF content, using filename batches: ${filenameInfo.batchNumbers.join(", ")}`,
      );
    }

    this.logger.log(`Detected graph PDF: ${filename}, batch numbers: ${batchNumbers.join(", ")}`);
    return { isGraph: true, batchNumbers };
  }

  private async linkGraphToExistingCoc(
    file: Express.Multer.File,
    pdfText: string,
    batchNumbers: string[],
  ): Promise<number | null> {
    if (batchNumbers.length === 0) {
      return null;
    }

    const existingCocs = await this.cocService.allSupplierCocs();

    for (const coc of existingCocs) {
      const cocBatches = coc.extractedData?.batchNumbers || [];
      const hasMatchingBatches = batchNumbers.some((bn) => cocBatches.includes(bn));

      if (hasMatchingBatches && !coc.graphPdfPath) {
        const subPath = coc.supplierCompanyId
          ? `au-rubber/graphs/${coc.supplierCompanyId}`
          : "au-rubber/graphs";

        const storageResult = await this.storageService.upload(file, subPath);

        await this.cocService.updateSupplierCoc(coc.id, {
          graphPdfPath: storageResult.path,
        });

        return coc.id;
      }
    }

    return null;
  }

  private triggerReadinessCheckForGraphLink(cocId: number): void {
    this.auCocReadinessService
      .checkAndAutoGenerateForCoc(cocId)
      .catch((error) => {
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

    let coding = await this.productCodingRepository.findOne({
      where: {
        codingType: ProductCodingType.COMPOUND,
        code: fullCode,
      },
    });

    if (!coding) {
      this.logger.log(`Creating new compound coding: ${fullCode} - ${fullName}`);
      coding = this.productCodingRepository.create({
        firebaseUid: `pg_${generateUniqueId()}`,
        codingType: ProductCodingType.COMPOUND,
        code: fullCode,
        name: fullName,
      });
      await this.productCodingRepository.save(coding);
    } else {
      this.logger.log(`Found existing compound coding: ${coding.code} - ${coding.name}`);
    }

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

    const analyzedFiles: AnalyzedCustomerDnFile[] = [];
    const unmatchedCustomerNames: string[] = [];
    const extractionErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.logger.log(`Analyzing customer DN file ${i + 1}/${files.length}: ${file.originalname}`);

      let deliveryNotesFromFile: Array<Record<string, unknown>> = [];
      try {
        const isAvailable = await this.cocExtractionService.isAvailable();
        if (!isAvailable) {
          throw new Error("GEMINI_API_KEY not configured - AI extraction unavailable");
        }

        this.logger.log(`Using OCR-based extraction for ${file.originalname}`);
        const extraction = await this.cocExtractionService.extractCustomerDeliveryNoteFromImages(
          file.buffer,
        );
        deliveryNotesFromFile = extraction.deliveryNotes as Array<Record<string, unknown>>;
        this.logger.log(
          `Extracted ${deliveryNotesFromFile.length} customer DN(s) from ${file.originalname} via OCR`,
        );
      } catch (error) {
        const errorMsg = `Failed to extract from ${file.originalname}: ${error.message}`;
        this.logger.error(errorMsg);
        extractionErrors.push(errorMsg);
      }

      if (deliveryNotesFromFile.length === 0) {
        deliveryNotesFromFile = [{}];
      }

      for (let dnIndex = 0; dnIndex < deliveryNotesFromFile.length; dnIndex++) {
        const extractedData = deliveryNotesFromFile[dnIndex];
        const customerName = (extractedData.customerName as string) || null;
        const customerReference = (extractedData.customerReference as string) || null;
        this.logger.log(
          `[CustomerDN] Extracted DN #${dnIndex + 1}: number=${extractedData.deliveryNoteNumber}, ref=${customerReference}, customer=${customerName}`,
        );
        let customerId: number | null = null;

        if (customerName) {
          const matchedCompany = this.matchCustomerByName(customerName, customerCompanies);
          if (matchedCompany) {
            customerId = matchedCompany.id;
            this.logger.log(
              `Matched customer "${customerName}" to company ${matchedCompany.name} (ID: ${matchedCompany.id})`,
            );
          } else {
            if (!unmatchedCustomerNames.includes(customerName)) {
              unmatchedCustomerNames.push(customerName);
            }
            this.logger.warn(`Could not match customer "${customerName}" to any existing company`);
          }
        }

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

        const filenameWithIndex =
          deliveryNotesFromFile.length > 1
            ? `${file.originalname} (DN ${dnIndex + 1}/${deliveryNotesFromFile.length})`
            : file.originalname;

        analyzedFiles.push({
          filename: filenameWithIndex,
          originalFileIndex: i,
          deliveryNoteNumber: (extractedData.deliveryNoteNumber as string) || null,
          customerReference: (extractedData.customerReference as string) || null,
          deliveryDate: (extractedData.deliveryDate as string) || null,
          customerName,
          customerId,
          pageInfo: pageInfo
            ? { currentPage: pageInfo.currentPage || null, totalPages: pageInfo.totalPages || null }
            : null,
          lineItems,
          pdfText: "",
        });
      }
    }

    const groups = this.groupCustomerDnsByNumber(analyzedFiles);

    const dnNumbersWithCustomers = groups
      .filter((g) => g.deliveryNoteNumber && g.customerId)
      .map((g) => ({ number: g.deliveryNoteNumber, customerId: g.customerId! }));

    const existingDnNumbers: string[] = [];
    for (const { number: dnNumber, customerId } of dnNumbersWithCustomers) {
      const existing = await this.deliveryNoteService.findByDnNumberAndCompany(
        dnNumber,
        customerId,
      );
      if (existing) {
        existingDnNumbers.push(dnNumber);
      }
    }

    this.logger.log(
      `Analysis complete: ${analyzedFiles.length} files, ${groups.length} groups, ${extractionErrors.length} errors, ${existingDnNumbers.length} existing DNs`,
    );

    if (extractionErrors.length > 0) {
      this.logger.warn(`Extraction errors: ${extractionErrors.join("; ")}`);
    }

    return {
      files: analyzedFiles,
      groups,
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
    const groupMap = new Map<string, CustomerDnGroup>();

    files.forEach((file, index) => {
      let dnNumber = file.deliveryNoteNumber;

      if (!dnNumber) {
        const filenameMatch = file.filename.match(/DN[-_]?(\d+)/i);
        if (filenameMatch) {
          dnNumber = `DN${filenameMatch[1]}`;
          this.logger.log(`Extracted DN number from filename: ${dnNumber}`);
        } else {
          dnNumber = file.filename.replace(/\.[^/.]+$/, "");
        }
      }

      if (!groupMap.has(dnNumber)) {
        groupMap.set(dnNumber, {
          deliveryNoteNumber: dnNumber,
          customerReference: file.customerReference,
          deliveryDate: file.deliveryDate,
          customerId: file.customerId,
          customerName: file.customerName,
          files: [],
          allLineItems: [],
        });
      }

      const group = groupMap.get(dnNumber)!;

      group.files.push({
        fileIndex: file.originalFileIndex,
        filename: file.filename,
        pageNumber: file.pageInfo?.currentPage || null,
      });

      group.allLineItems = [...group.allLineItems, ...file.lineItems];

      if (!group.customerReference && file.customerReference) {
        group.customerReference = file.customerReference;
      }
      if (!group.deliveryDate && file.deliveryDate) {
        group.deliveryDate = file.deliveryDate;
      }
      if (!group.customerId && file.customerId) {
        group.customerId = file.customerId;
        group.customerName = file.customerName;
      }
    });

    const groups = Array.from(groupMap.values());

    groups.forEach((group) => {
      group.files.sort((a, b) => {
        if (a.pageNumber !== null && b.pageNumber !== null) {
          return a.pageNumber - b.pageNumber;
        }
        return a.fileIndex - b.fileIndex;
      });
    });

    return groups;
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
    const deliveryNoteIds: number[] = [];
    const errors: string[] = [];

    this.logger.log(
      `Starting creation of ${analysis.groups.length} customer DNs from ${files.length} files`,
    );

    for (let groupIdx = 0; groupIdx < analysis.groups.length; groupIdx++) {
      const group = analysis.groups[groupIdx];
      const override = overrides[groupIdx] || {};

      this.logger.log(
        `Processing group ${groupIdx + 1}/${analysis.groups.length}: DN ${group.deliveryNoteNumber}`,
      );

      try {
        const customerId = override.customerId || group.customerId;
        if (!customerId) {
          this.logger.warn(`Skipping group ${group.deliveryNoteNumber}: no customer ID`);
          errors.push(`Group ${group.deliveryNoteNumber}: no customer ID`);
          continue;
        }

        const deliveryNoteNumber = override.deliveryNoteNumber || group.deliveryNoteNumber;
        const customerReference = override.customerReference || group.customerReference;
        const deliveryDate = override.deliveryDate || group.deliveryDate;

        const groupFiles = group.files.map((f) => files[f.fileIndex]);
        const firstFile = groupFiles[0];
        if (!firstFile) {
          this.logger.warn(`Skipping group ${deliveryNoteNumber}: no file available`);
          errors.push(`Group ${deliveryNoteNumber}: no file available`);
          continue;
        }

        const subPath = `au-rubber/customer-delivery-notes/${customerId}`;
        this.logger.log(`Uploading file for DN ${deliveryNoteNumber} to ${subPath}`);
        const storageResult = await this.storageService.upload(firstFile, subPath);
        this.logger.log(`File uploaded to ${storageResult.path}`);

        const existingDn = await this.deliveryNoteService.findByDnNumberAndCompany(
          deliveryNoteNumber,
          customerId,
        );

        let dnId: number;

        if (existingDn) {
          this.logger.log(
            `Found existing DN ${existingDn.id} for ${deliveryNoteNumber} - overwriting`,
          );
          await this.deliveryNoteService.updateDeliveryNote(existingDn.id, {
            deliveryNoteNumber,
            deliveryDate: deliveryDate || undefined,
            status: DeliveryNoteStatus.PENDING,
          });
          await this.deliveryNoteService.updateDocumentPath(existingDn.id, storageResult.path);
          await this.deliveryNoteService.replaceDeliveryNoteItems(existingDn.id);
          dnId = existingDn.id;
        } else {
          const dn = await this.deliveryNoteService.createDeliveryNote(
            {
              deliveryNoteType: DeliveryNoteType.ROLL,
              supplierCompanyId: customerId,
              documentPath: storageResult.path,
              deliveryNoteNumber,
              deliveryDate: deliveryDate || undefined,
              customerReference: customerReference || undefined,
            },
            createdBy,
          );
          dnId = dn.id;
        }

        for (const lineItem of group.allLineItems) {
          await this.deliveryNoteService.createDeliveryNoteItem({
            deliveryNoteId: dnId,
            compoundType: lineItem.compoundType,
            thicknessMm: lineItem.thicknessMm,
            widthMm: lineItem.widthMm,
            lengthM: lineItem.lengthM,
            quantity: lineItem.quantity,
            rollWeightKg: lineItem.rollWeightKg,
            cocBatchNumbers: lineItem.cocBatchNumbers,
          });
        }

        deliveryNoteIds.push(dnId);
        this.logger.log(
          `${existingDn ? "Overwrote" : "Created"} customer DN ${dnId} (${deliveryNoteNumber}) with ${group.allLineItems.length} line items`,
        );

        this.triggerReadinessCheckForDeliveryNote(dnId);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to create DN for group ${groupIdx + 1} (${group.deliveryNoteNumber}): ${errorMsg}`,
        );
        errors.push(`Group ${group.deliveryNoteNumber}: ${errorMsg}`);
      }
    }

    this.logger.log(
      `Completed DN creation: ${deliveryNoteIds.length} created, ${errors.length} errors`,
    );
    if (errors.length > 0) {
      this.logger.warn(`DN creation errors: ${errors.join("; ")}`);
    }

    return { deliveryNoteIds };
  }
}
