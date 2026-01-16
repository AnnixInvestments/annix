import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  AiExtractionRequest,
  AiExtractionResponse,
  AiExtractedItem,
} from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { ClaudeProvider } from './claude.provider';
import { ExtractedItem, SpecificationCellData } from '../services/excel-extractor.service';

export type AiProviderType = 'gemini' | 'claude' | 'auto';

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private readonly providers: Map<string, AiProvider> = new Map();
  private preferredProvider: AiProviderType = 'auto';

  constructor() {
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('claude', new ClaudeProvider());
  }

  setPreferredProvider(provider: AiProviderType): void {
    this.preferredProvider = provider;
    this.logger.log(`AI provider preference set to: ${provider}`);
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }

  async extractWithAi(
    text: string,
    documentName?: string,
    providerOverride?: AiProviderType,
  ): Promise<{
    items: ExtractedItem[];
    specificationCells: SpecificationCellData[];
    metadata: Record<string, any>;
    providerUsed: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  }> {
    const providerToUse = providerOverride || this.preferredProvider;
    const provider = await this.selectProvider(providerToUse);

    if (!provider) {
      this.logger.warn('No AI provider available, returning empty result');
      return {
        items: [],
        specificationCells: [],
        metadata: {},
        providerUsed: 'none',
      };
    }

    this.logger.log(`Using AI provider: ${provider.name} for document: ${documentName}`);

    const request: AiExtractionRequest = {
      text: this.truncateText(text, 100000),
      documentName,
      hints: {
        expectedItemTypes: ['pipe', 'bend', 'reducer', 'tee', 'flange'],
      },
    };

    const response = await provider.extractItems(request);

    const items = this.convertToExtractedItems(response.items);
    const specificationCells = this.convertToSpecificationCells(response.specifications);

    return {
      items,
      specificationCells,
      metadata: {
        ...response.metadata,
        aiProvider: provider.name,
      },
      providerUsed: provider.name,
      tokensUsed: response.tokensUsed,
      processingTimeMs: response.processingTimeMs,
    };
  }

  private async selectProvider(preference: AiProviderType): Promise<AiProvider | null> {
    if (preference !== 'auto') {
      const provider = this.providers.get(preference);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
      this.logger.warn(`Preferred provider ${preference} not available, falling back to auto`);
    }

    const priorityOrder = ['gemini', 'claude'];
    for (const name of priorityOrder) {
      const provider = this.providers.get(name);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }

    return null;
  }

  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;

    this.logger.warn(`Truncating text from ${text.length} to ${maxChars} characters`);
    return text.substring(0, maxChars) + '\n\n[TEXT TRUNCATED]';
  }

  private convertToExtractedItems(aiItems: AiExtractedItem[]): ExtractedItem[] {
    return aiItems.map((item, index) => ({
      rowNumber: index + 1,
      itemNumber: item.itemNumber || `AI-${index + 1}`,
      description: item.description,
      itemType: item.itemType,
      material: item.material || null,
      materialGrade: item.materialGrade || null,
      diameter: item.diameter || null,
      diameterUnit: (item.diameterUnit as 'mm' | 'inch') || 'mm',
      secondaryDiameter: item.secondaryDiameter || null,
      length: item.length || null,
      wallThickness: item.wallThickness || null,
      schedule: item.schedule || null,
      angle: item.angle || null,
      flangeConfig: item.flangeConfig || null,
      quantity: item.quantity || 1,
      unit: item.unit || 'ea',
      confidence: item.confidence || 0.8,
      needsClarification: item.confidence < 0.7 || !item.diameter || !item.material,
      clarificationReason: this.getClarificationReason(item),
      rawData: { source: 'ai', rawText: item.rawText },
    }));
  }

  private getClarificationReason(item: AiExtractedItem): string | null {
    const missing: string[] = [];
    if (!item.diameter) missing.push('diameter');
    if (!item.material) missing.push('material');
    if (item.confidence < 0.7) missing.push('low confidence');

    return missing.length > 0 ? `Missing or uncertain: ${missing.join(', ')}` : null;
  }

  private convertToSpecificationCells(specs?: Record<string, any>): SpecificationCellData[] {
    if (!specs || Object.keys(specs).length === 0) {
      return [];
    }

    const parts: string[] = [];
    if (specs.standard) parts.push(`Standard: ${specs.standard}`);
    if (specs.materialGrade) parts.push(`Grade: ${specs.materialGrade}`);
    if (specs.wallThickness) parts.push(`Wall: ${specs.wallThickness}`);
    if (specs.lining) parts.push(`Lining: ${specs.lining}`);
    if (specs.externalCoating) parts.push(`Coating: ${specs.externalCoating}`);
    if (specs.schedule) parts.push(`Schedule: ${specs.schedule}`);

    if (parts.length === 0) return [];

    return [{
      cellRef: 'AI-SPEC',
      rowNumber: 0,
      rawText: parts.join(' | '),
      parsedData: {
        materialGrade: specs.materialGrade || null,
        wallThickness: specs.wallThickness || null,
        lining: specs.lining || null,
        externalCoating: specs.externalCoating || null,
        standard: specs.standard || null,
        schedule: specs.schedule || null,
      },
    }];
  }
}
