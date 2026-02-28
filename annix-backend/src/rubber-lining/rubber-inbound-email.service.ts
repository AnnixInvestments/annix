import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE, StorageResult } from "../storage/storage.interface";
import { RubberCompany } from "./entities/rubber-company.entity";
import { DeliveryNoteType } from "./entities/rubber-delivery-note.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberCocService } from "./rubber-coc.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

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
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
    private cocService: RubberCocService,
    private deliveryNoteService: RubberDeliveryNoteService,
    private aiChatService: AiChatService,
    private cocExtractionService: RubberCocExtractionService,
  ) {}

  async processInboundEmail(emailData: InboundEmailData): Promise<ProcessedEmailResult> {
    const result: ProcessedEmailResult = {
      success: false,
      cocIds: [],
      deliveryNoteIds: [],
      errors: [],
    };

    this.logger.log(
      `Processing inbound email from: ${emailData.from}, subject: ${emailData.subject}`,
    );

    const pdfAttachments = emailData.attachments.filter(
      (att) =>
        att.contentType === "application/pdf" ||
        att.filename?.toLowerCase().endsWith(".pdf"),
    );

    if (pdfAttachments.length === 0) {
      result.errors.push("No PDF attachments found in email");
      this.logger.warn("No PDF attachments found in email");
      return result;
    }

    const documentType = this.determineDocumentType(emailData.subject);

    for (const attachment of pdfAttachments) {
      try {
        const pdfText = await this.extractTextFromPdf(attachment.content);

        const supplierMapping = await this.identifySupplierFromDocument(
          pdfText,
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

        if (documentType === "coc") {
          const coc = await this.cocService.createSupplierCoc(
            {
              cocType: supplierMapping.cocType,
              supplierCompanyId: supplierMapping.company.id,
              documentPath: storageResult.path,
            },
            `inbound-email:${emailData.from}`,
          );
          result.cocIds.push(coc.id);
          this.logger.log(`Created Supplier CoC ${coc.id} from email attachment`);
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

    result.success =
      result.cocIds.length > 0 || result.deliveryNoteIds.length > 0;
    return result;
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
          c.name.toLowerCase().includes("impilo") ||
          c.name.toLowerCase().includes("calendarer"),
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
        (c) =>
          c.name.toLowerCase().includes("s&n") ||
          c.name.toLowerCase().includes("compounder"),
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
          c.name.toLowerCase().includes("impilo") ||
          c.name.toLowerCase().includes("calendarer"),
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

  private determineDocumentType(subject: string): "coc" | "delivery_note" {
    const subjectLower = subject.toLowerCase();

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

  private async saveAttachment(
    attachment: InboundEmailAttachment,
    companyId: number,
    documentType: "coc" | "delivery_note",
  ): Promise<StorageResult> {
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

    const subPath = `rubber-lining/${documentType}s/${companyId}`;
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
          const linkedCocId = await this.linkGraphToExistingCoc(file, pdfText, graphInfo.batchNumbers);
          if (linkedCocId) {
            this.logger.log(`Linked graph PDF to existing CoC ${linkedCocId}`);
            result.cocIds.push(linkedCocId);
            continue;
          }
          this.logger.warn("Could not find matching COC for graph, creating new COC");
        }

        const supplierInfo = await this.identifySupplierWithAi(
          pdfText,
          file.originalname,
        );

        const detectedCocType = supplierInfo?.cocType || metadata.cocType || SupplierCocType.COMPOUNDER;
        const detectedSupplierId = supplierInfo?.companyId || metadata.supplierCompanyId;

        const subPath = detectedSupplierId
          ? `rubber-lining/cocs/${detectedSupplierId}`
          : `rubber-lining/cocs/${detectedCocType.toLowerCase()}`;

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
      const subPath = `rubber-lining/delivery-notes/${metadata.supplierCompanyId || "unknown"}`;

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
      this.logger.log(`Graph detection for ${file.originalname}: isGraph=${graphInfo.isGraph}, batchNumbers=${graphInfo.batchNumbers.join(",")}`);

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

        const supplierInfo = await this.identifySupplierWithAi(pdfText, file.originalname);
        const cocType = supplierInfo?.cocType || SupplierCocType.COMPOUNDER;
        const companyId = supplierInfo?.companyId || null;
        const company = companyId ? companies.find((c) => c.id === companyId) : null;

        let extractedData: Record<string, unknown> | null = null;
        try {
          const extraction = await this.cocExtractionService.extractByType(cocType, pdfText);
          extractedData = extraction.data as Record<string, unknown>;
          this.logger.log(`Extracted data for ${file.originalname}: ${JSON.stringify(extractedData).substring(0, 200)}`);
        } catch (error) {
          this.logger.error(`Failed to extract data from ${file.originalname}: ${error.message}`);
        }

        const batchNumbers = (extractedData?.batchNumbers as string[]) || [];

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
        const hasMatchingBatch = graphFile.batchNumbers.some((gbn) =>
          dataFile.batchNumbers.includes(gbn),
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

      const subPath = analyzed.companyId
        ? `rubber-lining/cocs/${analyzed.companyId}`
        : `rubber-lining/cocs/${(analyzed.cocType || "compounder").toLowerCase()}`;

      const storageResult = await this.storageService.upload(file, subPath);

      const coc = await this.cocService.createSupplierCoc(
        {
          cocType: analyzed.cocType || SupplierCocType.COMPOUNDER,
          supplierCompanyId: analyzed.companyId || undefined,
          documentPath: storageResult.path,
          compoundCode: (analyzed.extractedData?.compoundCode as string) || undefined,
        },
        createdBy,
      );

      if (analyzed.extractedData) {
        await this.cocService.setExtractedData(coc.id, analyzed.extractedData);
      }

      cocIds.push(coc.id);
      createdCocsByIndex.set(dataIdx, coc.id);
      this.logger.log(`Created CoC ${coc.id} from ${analyzed.filename}`);
    }

    for (const graphIdx of analysis.graphPdfs) {
      const analyzed = analysis.files[graphIdx];
      const file = files[graphIdx];

      if (analyzed.linkedToIndex !== null) {
        const linkedCocId = createdCocsByIndex.get(analyzed.linkedToIndex);
        if (linkedCocId) {
          const subPath = analyzed.companyId
            ? `rubber-lining/graphs/${analyzed.companyId}`
            : "rubber-lining/graphs";

          const storageResult = await this.storageService.upload(file, subPath);

          await this.cocService.updateSupplierCoc(linkedCocId, {
            graphPdfPath: storageResult.path,
          });

          this.logger.log(`Linked graph ${analyzed.filename} to CoC ${linkedCocId}`);
          continue;
        }
      }

      const subPath = analyzed.companyId
        ? `rubber-lining/cocs/${analyzed.companyId}`
        : "rubber-lining/cocs/unknown";

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
  ): Promise<{ cocType: SupplierCocType; companyId?: number } | null> {
    const companies = await this.companyRepository.find();
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
      this.logger.log(`Identified as Impilo from filename/content pattern`);
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
        (c) =>
          c.name.toLowerCase().includes("s&n") ||
          c.name.toLowerCase().includes("compounder"),
      );
      this.logger.log(`Identified as S&N Rubber from content pattern`);
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

    const systemPrompt = `You are analyzing rubber industry Certificate of Conformance (CoC) documents to identify the supplier type.

There are two types of suppliers:
1. COMPOUNDER - Companies that compound rubber (mix raw materials). Usually S&N Rubber or similar. Their documents typically mention:
   - Batch numbers, compound codes, mixing dates
   - Physical properties like Shore A hardness, specific gravity, tensile strength
   - Rheometer data (S-min, S-max, Ts2, Tc90)
   - Terms like "compound", "batch", "mixing"

2. CALENDARER - Companies that calender rubber into sheets/rolls. Usually Impilo or similar. Their documents typically mention:
   - Roll numbers, sheet specifications, order numbers, ticket numbers
   - Calendering operations, rubber sheets
   - Terms like "calendering", "roll", "sheet", "lining"
   - IMPILO INDUSTRIES header

Respond ONLY with a JSON object in this exact format:
{"supplierType": "COMPOUNDER" or "CALENDARER", "confidence": 0.0-1.0, "reason": "brief explanation"}`;

    const userMessage = `Analyze this PDF document and identify the supplier type.

Filename: ${filename}

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

          return { cocType, companyId };
        }
      }

      this.logger.warn("AI response did not contain valid supplier type JSON");
      return null;
    } catch (error) {
      this.logger.error(`AI supplier identification failed: ${error.message}`);
      return null;
    }
  }

  private detectIfGraph(pdfText: string, filename: string): { isGraph: boolean; batchNumbers: string[] } {
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
          ? `rubber-lining/graphs/${coc.supplierCompanyId}`
          : "rubber-lining/graphs";

        const storageResult = await this.storageService.upload(file, subPath);

        await this.cocService.updateSupplierCoc(coc.id, {
          graphPdfPath: storageResult.path,
        });

        return coc.id;
      }
    }

    return null;
  }

  private autoExtractCoc(cocId: number, cocType: SupplierCocType, pdfText: string): void {
    this.cocExtractionService
      .extractByType(cocType, pdfText)
      .then(async (result) => {
        if (result && result.data) {
          await this.cocService.setExtractedData(cocId, result.data);
          this.logger.log(`Auto-extracted data for CoC ${cocId} in ${result.processingTimeMs}ms`);
        }
      })
      .catch((error) => {
        this.logger.error(`Auto-extraction failed for CoC ${cocId}: ${error.message}`);
      });
  }
}
