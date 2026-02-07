import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomFieldValue } from "../entities/custom-field-value.entity";
import { NixExtractionRegion } from "../entities/nix-extraction-region.entity";

export interface SaveCustomFieldDto {
  entityType: "customer" | "supplier";
  entityId: number;
  fieldName: string;
  fieldValue: string | null;
  documentCategory: string;
  extractedFromDocumentId?: number;
  confidence?: number;
}

export interface CustomFieldDefinition {
  fieldName: string;
  documentCategory: string;
  sampleValue: string | null;
}

@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(
    @InjectRepository(CustomFieldValue)
    private readonly customFieldValueRepo: Repository<CustomFieldValue>,
    @InjectRepository(NixExtractionRegion)
    private readonly extractionRegionRepo: Repository<NixExtractionRegion>,
  ) {}

  async saveCustomFieldValue(dto: SaveCustomFieldDto): Promise<CustomFieldValue> {
    this.logger.log(`Saving custom field ${dto.fieldName} for ${dto.entityType} ${dto.entityId}`);

    const existing = await this.customFieldValueRepo.findOne({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        fieldName: dto.fieldName,
      },
    });

    if (existing) {
      existing.fieldValue = dto.fieldValue;
      existing.documentCategory = dto.documentCategory;
      existing.extractedFromDocumentId = dto.extractedFromDocumentId ?? null;
      existing.confidence = dto.confidence ?? null;
      return this.customFieldValueRepo.save(existing);
    }

    const customField = this.customFieldValueRepo.create({
      entityType: dto.entityType,
      entityId: dto.entityId,
      fieldName: dto.fieldName,
      fieldValue: dto.fieldValue,
      documentCategory: dto.documentCategory,
      extractedFromDocumentId: dto.extractedFromDocumentId ?? null,
      confidence: dto.confidence ?? null,
      isVerified: false,
    });

    return this.customFieldValueRepo.save(customField);
  }

  async customFieldsForEntity(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<CustomFieldValue[]> {
    return this.customFieldValueRepo.find({
      where: { entityType, entityId },
      order: { fieldName: "ASC" },
    });
  }

  async customFieldDefinitions(): Promise<CustomFieldDefinition[]> {
    const regions = await this.extractionRegionRepo.find({
      where: { isCustomField: true, isActive: true },
      order: { documentCategory: "ASC", fieldName: "ASC" },
    });

    return regions.map((r) => ({
      fieldName: r.fieldName,
      documentCategory: r.documentCategory,
      sampleValue: r.sampleValue,
    }));
  }

  async customFieldDefinitionsForDocumentCategory(
    documentCategory: string,
  ): Promise<CustomFieldDefinition[]> {
    const regions = await this.extractionRegionRepo.find({
      where: { isCustomField: true, isActive: true, documentCategory },
      order: { fieldName: "ASC" },
    });

    return regions.map((r) => ({
      fieldName: r.fieldName,
      documentCategory: r.documentCategory,
      sampleValue: r.sampleValue,
    }));
  }

  async verifyCustomField(id: number, verifiedByUserId: number): Promise<CustomFieldValue> {
    const field = await this.customFieldValueRepo.findOneOrFail({
      where: { id },
    });
    field.isVerified = true;
    field.verifiedByUserId = verifiedByUserId;
    return this.customFieldValueRepo.save(field);
  }

  async updateCustomFieldValue(id: number, newValue: string): Promise<CustomFieldValue> {
    const field = await this.customFieldValueRepo.findOneOrFail({
      where: { id },
    });
    field.fieldValue = newValue;
    field.isVerified = false;
    field.verifiedByUserId = null;
    return this.customFieldValueRepo.save(field);
  }

  async deleteCustomFieldValue(id: number): Promise<void> {
    await this.customFieldValueRepo.delete(id);
  }
}
