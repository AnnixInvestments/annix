import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NixExtraction,
  ExtractionStatus,
  DocumentType,
} from './entities/nix-extraction.entity';
import {
  NixLearning,
  LearningType,
  LearningSource,
} from './entities/nix-learning.entity';
import { NixUserPreference } from './entities/nix-user-preference.entity';
import {
  NixClarification,
  ClarificationStatus,
  ClarificationType,
} from './entities/nix-clarification.entity';
import {
  ProcessDocumentDto,
  ProcessDocumentResponseDto,
} from './dto/process-document.dto';
import {
  SubmitClarificationDto,
  SubmitClarificationResponseDto,
} from './dto/submit-clarification.dto';
import { ExcelExtractorService, ExtractedItem } from './services/excel-extractor.service';

@Injectable()
export class NixService {
  private readonly logger = new Logger(NixService.name);

  constructor(
    @InjectRepository(NixExtraction)
    private readonly extractionRepo: Repository<NixExtraction>,
    @InjectRepository(NixLearning)
    private readonly learningRepo: Repository<NixLearning>,
    @InjectRepository(NixUserPreference)
    private readonly preferenceRepo: Repository<NixUserPreference>,
    @InjectRepository(NixClarification)
    private readonly clarificationRepo: Repository<NixClarification>,
    private readonly excelExtractor: ExcelExtractorService,
  ) {}

  async processDocument(dto: ProcessDocumentDto): Promise<ProcessDocumentResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Processing document: ${dto.documentPath} (${dto.documentName})`);

    const documentType = this.detectDocumentType(dto.documentName || dto.documentPath);

    const extraction = this.extractionRepo.create({
      documentName: dto.documentName || dto.documentPath.split('/').pop() || 'unknown',
      documentPath: dto.documentPath,
      documentType,
      status: ExtractionStatus.PROCESSING,
      userId: dto.userId,
      rfqId: dto.rfqId,
    });

    await this.extractionRepo.save(extraction);

    try {
      let extractedData: Record<string, any>;
      let extractedItems: Array<any> = [];

      switch (documentType) {
        case DocumentType.PDF:
          ({ extractedData, extractedItems } = await this.extractFromPdf(dto.documentPath));
          break;
        case DocumentType.EXCEL:
          ({ extractedData, extractedItems } = await this.extractFromExcel(dto.documentPath));
          break;
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }

      const relevantItems = await this.filterByRelevance(extractedItems, dto.productTypes);
      const clarifications = await this.generateClarifications(extraction, relevantItems);

      extraction.extractedData = extractedData;
      extraction.extractedItems = relevantItems;
      extraction.relevanceScore = this.calculateOverallRelevance(relevantItems);
      extraction.processingTimeMs = Date.now() - startTime;
      extraction.status = clarifications.length > 0
        ? ExtractionStatus.NEEDS_CLARIFICATION
        : ExtractionStatus.COMPLETED;

      await this.extractionRepo.save(extraction);

      return {
        extractionId: extraction.id,
        status: extraction.status,
        items: relevantItems,
        pendingClarifications: clarifications.map(c => ({
          id: c.id,
          question: c.question,
          context: c.context || {},
        })),
      };
    } catch (error) {
      extraction.status = ExtractionStatus.FAILED;
      extraction.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      extraction.processingTimeMs = Date.now() - startTime;
      await this.extractionRepo.save(extraction);

      this.logger.error(`Document processing failed: ${extraction.errorMessage}`);

      return {
        extractionId: extraction.id,
        status: extraction.status,
        error: extraction.errorMessage,
      };
    }
  }

  async submitClarification(dto: SubmitClarificationDto): Promise<SubmitClarificationResponseDto> {
    const clarification = await this.clarificationRepo.findOne({
      where: { id: dto.clarificationId },
      relations: ['extraction'],
    });

    if (!clarification) {
      return { success: false };
    }

    clarification.responseType = dto.responseType;
    clarification.responseText = dto.responseText;
    clarification.responseScreenshotPath = dto.screenshotPath;
    clarification.responseDocumentRef = dto.documentRef;
    clarification.status = ClarificationStatus.ANSWERED;
    clarification.answeredAt = new Date();

    await this.clarificationRepo.save(clarification);

    if (dto.allowLearning !== false) {
      await this.learnFromClarification(clarification);
    }

    const remainingCount = await this.clarificationRepo.count({
      where: {
        extractionId: clarification.extractionId,
        status: ClarificationStatus.PENDING,
      },
    });

    if (remainingCount === 0 && clarification.extraction) {
      clarification.extraction.status = ExtractionStatus.COMPLETED;
      await this.extractionRepo.save(clarification.extraction);
    }

    return {
      success: true,
      updatedExtraction: clarification.extraction ? {
        extractionId: clarification.extraction.id,
        status: clarification.extraction.status,
        items: clarification.extraction.extractedItems,
      } : undefined,
      remainingClarifications: remainingCount,
    };
  }

  async extraction(id: number): Promise<NixExtraction | null> {
    return this.extractionRepo.findOne({
      where: { id },
      relations: ['user', 'rfq'],
    });
  }

  async pendingClarifications(extractionId: number): Promise<NixClarification[]> {
    return this.clarificationRepo.find({
      where: {
        extractionId,
        status: ClarificationStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async userExtractions(userId: number): Promise<NixExtraction[]> {
    return this.extractionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private detectDocumentType(path: string): DocumentType {
    const extension = path.split('.').pop()?.toLowerCase();

    const typeMap: Record<string, DocumentType> = {
      pdf: DocumentType.PDF,
      xlsx: DocumentType.EXCEL,
      xls: DocumentType.EXCEL,
      csv: DocumentType.EXCEL,
      doc: DocumentType.WORD,
      docx: DocumentType.WORD,
      dwg: DocumentType.CAD,
      dxf: DocumentType.CAD,
      sldprt: DocumentType.SOLIDWORKS,
      sldasm: DocumentType.SOLIDWORKS,
      png: DocumentType.IMAGE,
      jpg: DocumentType.IMAGE,
      jpeg: DocumentType.IMAGE,
      tiff: DocumentType.IMAGE,
    };

    return typeMap[extension || ''] || DocumentType.UNKNOWN;
  }

  private async extractFromPdf(
    _documentPath: string,
  ): Promise<{ extractedData: Record<string, any>; extractedItems: Array<any> }> {
    this.logger.log('PDF extraction - placeholder implementation');

    return {
      extractedData: {
        pageCount: 0,
        hasText: true,
        hasTables: false,
        hasImages: false,
      },
      extractedItems: [],
    };
  }

  private async extractFromExcel(
    documentPath: string,
  ): Promise<{ extractedData: Record<string, any>; extractedItems: Array<any> }> {
    this.logger.log(`Excel extraction starting for: ${documentPath}`);

    const result = await this.excelExtractor.extractFromExcel(documentPath);

    this.logger.log(`Extracted ${result.items.length} items from sheet "${result.sheetName}"`);
    this.logger.log(`Items needing clarification: ${result.clarificationsNeeded}`);

    return {
      extractedData: {
        sheetName: result.sheetName,
        totalRows: result.totalRows,
        itemCount: result.items.length,
        clarificationsNeeded: result.clarificationsNeeded,
        metadata: result.metadata,
      },
      extractedItems: result.items,
    };
  }

  private async filterByRelevance(
    items: Array<any>,
    _productTypes?: string[],
  ): Promise<Array<any>> {
    const learningRules = await this.learningRepo.find({
      where: {
        learningType: LearningType.RELEVANCE_RULE,
        isActive: true,
      },
    });

    return items.map(item => ({
      ...item,
      confidence: this.calculateItemConfidence(item, learningRules),
    }));
  }

  private calculateItemConfidence(item: any, rules: NixLearning[]): number {
    let confidence = 0.5;

    rules.forEach(rule => {
      if (item.description?.toLowerCase().includes(rule.patternKey.toLowerCase())) {
        confidence = Math.min(1, confidence + 0.1 * rule.confidence);
      }
    });

    return confidence;
  }

  private calculateOverallRelevance(items: Array<any>): number {
    if (items.length === 0) return 0;

    const totalConfidence = items.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
    return totalConfidence / items.length;
  }

  private async generateClarifications(
    extraction: NixExtraction,
    items: Array<any>,
  ): Promise<NixClarification[]> {
    const clarifications: NixClarification[] = [];

    const itemsNeedingClarification = items.filter(
      (item: ExtractedItem) => item.needsClarification || (item.confidence || 0) < 0.7
    );

    for (const item of itemsNeedingClarification.slice(0, 10)) {
      const extractedItem = item as ExtractedItem;

      let question = '';
      let clarificationType = ClarificationType.AMBIGUOUS;

      if (extractedItem.clarificationReason) {
        question = `Row ${extractedItem.rowNumber}: ${extractedItem.clarificationReason}\n\nDescription: "${extractedItem.description}"\n\nPlease provide the missing information or correct any errors.`;
        clarificationType = ClarificationType.MISSING_INFO;
      } else if (!extractedItem.material) {
        question = `Row ${extractedItem.rowNumber}: I couldn't determine the material type for this item.\n\nDescription: "${extractedItem.description}"\n\nIs this Stainless Steel (SS) or Mild Steel (MS)?`;
        clarificationType = ClarificationType.MISSING_INFO;
      } else if (!extractedItem.diameter) {
        question = `Row ${extractedItem.rowNumber}: I couldn't determine the pipe diameter.\n\nDescription: "${extractedItem.description}"\n\nWhat is the diameter in mm?`;
        clarificationType = ClarificationType.MISSING_INFO;
      } else {
        question = `Row ${extractedItem.rowNumber}: Please verify this extracted item:\n\nDescription: "${extractedItem.description}"\n\nExtracted:\n- Type: ${extractedItem.itemType}\n- Material: ${extractedItem.material || 'Unknown'}\n- Diameter: ${extractedItem.diameter || 'Unknown'}mm\n- Quantity: ${extractedItem.quantity}\n\nIs this correct?`;
        clarificationType = ClarificationType.CONFIRMATION;
      }

      const clarification = this.clarificationRepo.create({
        extractionId: extraction.id,
        userId: extraction.userId,
        clarificationType,
        status: ClarificationStatus.PENDING,
        question,
        context: {
          rowNumber: extractedItem.rowNumber,
          itemNumber: extractedItem.itemNumber,
          itemDescription: extractedItem.description,
          itemType: extractedItem.itemType,
          extractedMaterial: extractedItem.material,
          extractedDiameter: extractedItem.diameter,
          extractedLength: extractedItem.length,
          extractedAngle: extractedItem.angle,
          extractedFlangeConfig: extractedItem.flangeConfig,
          extractedQuantity: extractedItem.quantity,
          confidence: extractedItem.confidence,
          clarificationReason: extractedItem.clarificationReason,
        },
      });

      clarifications.push(await this.clarificationRepo.save(clarification));
    }

    return clarifications;
  }

  private async learnFromClarification(clarification: NixClarification): Promise<void> {
    if (!clarification.responseText || !clarification.context?.itemDescription) {
      return;
    }

    const existingRule = await this.learningRepo.findOne({
      where: {
        patternKey: clarification.context.itemDescription,
        learningType: LearningType.CORRECTION,
      },
    });

    if (existingRule) {
      existingRule.learnedValue = clarification.responseText;
      existingRule.confirmationCount += 1;
      existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      await this.learningRepo.save(existingRule);
    } else {
      const newRule = this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: LearningSource.USER_CORRECTION,
        patternKey: clarification.context.itemDescription,
        originalValue: clarification.context.extractedValue,
        learnedValue: clarification.responseText,
        confidence: 0.6,
        confirmationCount: 1,
      });
      await this.learningRepo.save(newRule);
    }

    clarification.usedForLearning = true;
    await this.clarificationRepo.save(clarification);
  }

  async seedAdminRule(
    category: string,
    patternKey: string,
    learnedValue: string,
    applicableProducts?: string[],
  ): Promise<NixLearning> {
    const rule = this.learningRepo.create({
      learningType: LearningType.RELEVANCE_RULE,
      source: LearningSource.ADMIN_SEEDED,
      category,
      patternKey,
      learnedValue,
      applicableProducts,
      confidence: 0.9,
      confirmationCount: 1,
      isActive: true,
    });

    return this.learningRepo.save(rule);
  }

  async adminLearningRules(): Promise<NixLearning[]> {
    return this.learningRepo.find({
      where: { source: LearningSource.ADMIN_SEEDED },
      order: { createdAt: 'DESC' },
    });
  }

  async recordCorrection(correction: {
    extractionId?: number;
    itemDescription: string;
    fieldName: string;
    originalValue: string | number | null;
    correctedValue: string | number;
    userId?: number;
  }): Promise<{ success: boolean }> {
    const patternKey = `${correction.itemDescription}::${correction.fieldName}`;

    const existingRule = await this.learningRepo.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
      },
    });

    if (existingRule) {
      if (existingRule.learnedValue === String(correction.correctedValue)) {
        existingRule.confirmationCount += 1;
        existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      } else {
        existingRule.learnedValue = String(correction.correctedValue);
        existingRule.originalValue = correction.originalValue != null ? String(correction.originalValue) : undefined;
        existingRule.confirmationCount = 1;
        existingRule.confidence = 0.6;
      }
      await this.learningRepo.save(existingRule);
      this.logger.log(`Updated learning rule for pattern: ${patternKey}`);
    } else {
      const newRule = this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: LearningSource.USER_CORRECTION,
        patternKey,
        category: correction.fieldName,
        originalValue: correction.originalValue != null ? String(correction.originalValue) : undefined,
        learnedValue: String(correction.correctedValue),
        confidence: 0.6,
        confirmationCount: 1,
        isActive: true,
      });
      await this.learningRepo.save(newRule);
      this.logger.log(`Created new learning rule for pattern: ${patternKey}`);
    }

    return { success: true };
  }
}
