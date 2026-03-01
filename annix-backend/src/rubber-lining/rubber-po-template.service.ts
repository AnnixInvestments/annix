import * as crypto from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocumentAnnotationService } from "../nix/services/document-annotation.service";
import {
  RegionCoordinates,
  RubberPoExtractionRegion,
} from "./entities/rubber-po-extraction-region.entity";
import { RubberPoExtractionTemplate } from "./entities/rubber-po-extraction-template.entity";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

export interface TemplateRegionDto {
  fieldName: string;
  regionCoordinates: RegionCoordinates;
  labelCoordinates?: RegionCoordinates | null;
  labelText?: string | null;
  sampleValue?: string | null;
  confidenceThreshold?: number;
}

export interface CreateTemplateDto {
  companyId: number;
  formatHash: string;
  templateName?: string;
  regions: TemplateRegionDto[];
}

export interface TemplateExtractionResult {
  templateId: number;
  templateName: string | null;
  fields: Record<
    string,
    {
      value: string;
      confidence: number;
    }
  >;
  overallConfidence: number;
}

export interface PdfPageImage {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
}

@Injectable()
export class RubberPoTemplateService {
  private readonly logger = new Logger(RubberPoTemplateService.name);

  constructor(
    @InjectRepository(RubberPoExtractionTemplate)
    private readonly templateRepo: Repository<RubberPoExtractionTemplate>,
    @InjectRepository(RubberPoExtractionRegion)
    private readonly regionRepo: Repository<RubberPoExtractionRegion>,
    private readonly documentAnnotationService: DocumentAnnotationService,
  ) {}

  async computeFormatHash(buffer: Buffer): Promise<string> {
    try {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text || "";
      const pageCount = pdfData.numpages || 1;

      const staticLabels = this.extractStaticLabels(text);
      const tableHeaders = this.extractTableHeaders(text);

      const structureSignature = JSON.stringify({
        pageCount,
        staticLabels: staticLabels.slice(0, 20),
        tableHeaders: tableHeaders.slice(0, 10),
      });

      const hash = crypto.createHash("sha256").update(structureSignature).digest("hex");
      this.logger.log(`Computed format hash: ${hash.substring(0, 16)}... for document`);
      return hash;
    } catch (error) {
      this.logger.error(`Failed to compute format hash: ${error.message}`);
      return crypto.createHash("sha256").update(buffer).digest("hex");
    }
  }

  private extractStaticLabels(text: string): string[] {
    const labelPatterns = [
      /purchase\s*order/gi,
      /p\.?o\.?\s*(?:no|number|#)/gi,
      /order\s*(?:no|number|#)/gi,
      /date/gi,
      /delivery\s*date/gi,
      /ship\s*to/gi,
      /bill\s*to/gi,
      /vendor/gi,
      /supplier/gi,
      /item\s*(?:no|number|#)/gi,
      /description/gi,
      /quantity/gi,
      /qty/gi,
      /unit\s*price/gi,
      /amount/gi,
      /total/gi,
      /thickness/gi,
      /width/gi,
      /length/gi,
    ];

    const foundLabels: string[] = [];
    labelPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        foundLabels.push(matches[0].toLowerCase().trim());
      }
    });

    return [...new Set(foundLabels)].sort();
  }

  private extractTableHeaders(text: string): string[] {
    const lines = text.split("\n").map((l) => l.trim());
    const potentialHeaders: string[] = [];

    lines.forEach((line) => {
      const words = line.split(/\s+/);
      if (words.length >= 3 && words.length <= 10 && words.every((w) => w.length <= 20)) {
        const hasCommonHeaders = words.some((w) =>
          ["item", "qty", "quantity", "description", "price", "amount", "unit"].includes(
            w.toLowerCase(),
          ),
        );
        if (hasCommonHeaders) {
          potentialHeaders.push(words.join(" ").toLowerCase());
        }
      }
    });

    return potentialHeaders.slice(0, 5);
  }

  async findTemplateForDocument(
    companyId: number,
    buffer: Buffer,
  ): Promise<RubberPoExtractionTemplate | null> {
    const formatHash = await this.computeFormatHash(buffer);
    this.logger.log(
      `Looking for template: company=${companyId}, hash=${formatHash.substring(0, 16)}...`,
    );

    const template = await this.templateRepo.findOne({
      where: {
        companyId,
        formatHash,
        isActive: true,
      },
      relations: ["regions"],
    });

    if (template) {
      this.logger.log(
        `Found template ${template.id} "${template.templateName || "unnamed"}" with ${template.regions.length} regions`,
      );
    } else {
      this.logger.log(
        `No template found for company=${companyId}, hash=${formatHash.substring(0, 16)}...`,
      );
    }

    return template;
  }

  async createTemplate(
    dto: CreateTemplateDto,
    userId?: number,
  ): Promise<RubberPoExtractionTemplate> {
    this.logger.log(
      `Creating template for company=${dto.companyId}, hash=${dto.formatHash.substring(0, 16)}..., regions=${dto.regions.length}`,
    );

    const existingTemplate = await this.templateRepo.findOne({
      where: {
        companyId: dto.companyId,
        formatHash: dto.formatHash,
        isActive: true,
      },
    });

    if (existingTemplate) {
      this.logger.log(`Deactivating existing template ${existingTemplate.id}`);
      existingTemplate.isActive = false;
      await this.templateRepo.save(existingTemplate);
    }

    const template = this.templateRepo.create({
      companyId: dto.companyId,
      formatHash: dto.formatHash,
      templateName: dto.templateName || null,
      createdByUserId: userId || null,
      isActive: true,
    });

    const savedTemplate = await this.templateRepo.save(template);

    const regions = dto.regions.map((regionDto) =>
      this.regionRepo.create({
        templateId: savedTemplate.id,
        fieldName: regionDto.fieldName,
        regionCoordinates: regionDto.regionCoordinates,
        labelCoordinates: regionDto.labelCoordinates || null,
        labelText: regionDto.labelText || null,
        sampleValue: regionDto.sampleValue || null,
        confidenceThreshold: regionDto.confidenceThreshold ?? 0.7,
      }),
    );

    await this.regionRepo.save(regions);
    savedTemplate.regions = regions;

    this.logger.log(`Created template ${savedTemplate.id} with ${regions.length} regions`);
    return savedTemplate;
  }

  async extractUsingTemplate(
    template: RubberPoExtractionTemplate,
    buffer: Buffer,
  ): Promise<TemplateExtractionResult> {
    this.logger.log(
      `Extracting using template ${template.id} with ${template.regions.length} regions`,
    );

    const fields: Record<string, { value: string; confidence: number }> = {};
    const confidences: number[] = [];

    for (const region of template.regions) {
      const result = await this.documentAnnotationService.extractFromRegion(
        buffer,
        region.regionCoordinates,
        region.fieldName,
      );

      if (result.text && result.confidence >= region.confidenceThreshold) {
        fields[region.fieldName] = {
          value: result.text,
          confidence: result.confidence,
        };
        confidences.push(result.confidence);
        this.logger.log(
          `Extracted ${region.fieldName}: "${result.text.substring(0, 50)}..." (${Math.round(result.confidence * 100)}%)`,
        );
      } else {
        this.logger.warn(
          `Failed extraction for ${region.fieldName}: text="${result.text?.substring(0, 30) || ""}", confidence=${Math.round(result.confidence * 100)}%, threshold=${Math.round(region.confidenceThreshold * 100)}%`,
        );
      }
    }

    const overallConfidence =
      confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;

    return {
      templateId: template.id,
      templateName: template.templateName,
      fields,
      overallConfidence,
    };
  }

  async recordExtractionResult(templateId: number, success: boolean): Promise<void> {
    const template = await this.templateRepo.findOneBy({ id: templateId });
    if (template) {
      template.useCount += 1;
      if (success) {
        template.successCount += 1;
      }
      await this.templateRepo.save(template);
      this.logger.log(
        `Recorded extraction result for template ${templateId}: success=${success}, total=${template.useCount}, successRate=${Math.round((template.successCount / template.useCount) * 100)}%`,
      );
    }
  }

  async templatesForCompany(companyId: number): Promise<RubberPoExtractionTemplate[]> {
    return this.templateRepo.find({
      where: {
        companyId,
        isActive: true,
      },
      relations: ["regions"],
      order: { createdAt: "DESC" },
    });
  }

  async templateById(id: number): Promise<RubberPoExtractionTemplate | null> {
    return this.templateRepo.findOne({
      where: { id },
      relations: ["regions"],
    });
  }

  async deactivateTemplate(id: number): Promise<void> {
    await this.templateRepo.update(id, { isActive: false });
    this.logger.log(`Deactivated template ${id}`);
  }

  async convertDocumentToPages(buffer: Buffer): Promise<PdfPageImage[]> {
    const result = await this.documentAnnotationService.convertPdfToImages(buffer, 2.0);
    return result.pages.map((page) => ({
      pageNumber: page.pageNumber,
      imageData: page.imageData,
      width: page.width,
      height: page.height,
    }));
  }

  async extractFromRegion(
    buffer: Buffer,
    coordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<{ text: string; confidence: number }> {
    return this.documentAnnotationService.extractFromRegion(buffer, coordinates, fieldName);
  }

  async companyHasTemplates(companyId: number): Promise<boolean> {
    const count = await this.templateRepo.count({
      where: { companyId, isActive: true },
    });
    return count > 0;
  }
}
