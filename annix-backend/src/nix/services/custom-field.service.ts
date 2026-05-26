import { Injectable, Logger } from "@nestjs/common";
import { CustomFieldValueRepository } from "../custom-field-value.repository";
import { CustomFieldValue } from "../entities/custom-field-value.entity";
import { NixExtractionRegionRepository } from "../nix-extraction-region.repository";

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
    private readonly customFieldValueRepo: CustomFieldValueRepository,
    private readonly extractionRegionRepo: NixExtractionRegionRepository,
  ) {}

  async saveCustomFieldValue(dto: SaveCustomFieldDto): Promise<CustomFieldValue> {
    this.logger.log(`Saving custom field ${dto.fieldName} for ${dto.entityType} ${dto.entityId}`);

    const existing = await this.customFieldValueRepo.findByEntityAndField(
      dto.entityType,
      dto.entityId,
      dto.fieldName,
    );

    if (existing) {
      existing.fieldValue = dto.fieldValue;
      existing.documentCategory = dto.documentCategory;
      existing.extractedFromDocumentId = dto.extractedFromDocumentId ?? null;
      existing.confidence = dto.confidence ?? null;
      return this.customFieldValueRepo.save(existing);
    }

    return this.customFieldValueRepo.create({
      entityType: dto.entityType,
      entityId: dto.entityId,
      fieldName: dto.fieldName,
      fieldValue: dto.fieldValue,
      documentCategory: dto.documentCategory,
      extractedFromDocumentId: dto.extractedFromDocumentId ?? null,
      confidence: dto.confidence ?? null,
      isVerified: false,
    });
  }

  async customFieldsForEntity(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<CustomFieldValue[]> {
    return this.customFieldValueRepo.findForEntityOrdered(entityType, entityId);
  }

  async customFieldDefinitions(): Promise<CustomFieldDefinition[]> {
    const regions = await this.extractionRegionRepo.findCustomFieldDefinitions();

    return regions.map((r) => ({
      fieldName: r.fieldName,
      documentCategory: r.documentCategory,
      sampleValue: r.sampleValue,
    }));
  }

  async customFieldDefinitionsForDocumentCategory(
    documentCategory: string,
  ): Promise<CustomFieldDefinition[]> {
    const regions =
      await this.extractionRegionRepo.findCustomFieldDefinitionsForCategory(documentCategory);

    return regions.map((r) => ({
      fieldName: r.fieldName,
      documentCategory: r.documentCategory,
      sampleValue: r.sampleValue,
    }));
  }

  async verifyCustomField(id: number, verifiedByUserId: number): Promise<CustomFieldValue> {
    const field = await this.customFieldValueRepo.findByIdOrFail(id);
    field.isVerified = true;
    field.verifiedByUserId = verifiedByUserId;
    return this.customFieldValueRepo.save(field);
  }

  async updateCustomFieldValue(id: number, newValue: string): Promise<CustomFieldValue> {
    const field = await this.customFieldValueRepo.findByIdOrFail(id);
    field.fieldValue = newValue;
    field.isVerified = false;
    field.verifiedByUserId = null;
    return this.customFieldValueRepo.save(field);
  }

  async deleteCustomFieldValue(id: number): Promise<void> {
    await this.customFieldValueRepo.deleteById(id);
  }
}
