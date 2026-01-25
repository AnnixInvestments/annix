import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createWorker } from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import {
  NixExtractionRegion,
  RegionCoordinates,
} from '../entities/nix-extraction-region.entity';
import {
  SaveExtractionRegionDto,
  PdfPagesResponseDto,
  PdfPageImageDto,
} from '../dto/extraction-region.dto';

@Injectable()
export class DocumentAnnotationService {
  private readonly logger = new Logger(DocumentAnnotationService.name);

  constructor(
    @InjectRepository(NixExtractionRegion)
    private readonly regionRepository: Repository<NixExtractionRegion>,
  ) {}

  async convertPdfToImages(
    buffer: Buffer,
    scale: number = 2.0,
  ): Promise<PdfPagesResponseDto> {
    try {
      this.logger.log('Converting PDF to images for annotation view');

      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      const pngPages = await pdfToPng(arrayBuffer, {
        disableFontFace: true,
        useSystemFonts: true,
        viewportScale: scale,
      });

      if (!pngPages || pngPages.length === 0) {
        return { totalPages: 0, pages: [] };
      }

      const pages: PdfPageImageDto[] = pngPages
        .filter((page) => page.content)
        .map((page, index) => ({
          pageNumber: index + 1,
          imageData: page.content!.toString('base64'),
          width: page.width,
          height: page.height,
        }));

      this.logger.log(`Converted PDF to ${pages.length} images`);
      return { totalPages: pages.length, pages };
    } catch (error) {
      this.logger.error(`Failed to convert PDF to images: ${error.message}`);
      throw error;
    }
  }

  async extractFromRegion(
    buffer: Buffer,
    regionCoordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<{ text: string; confidence: number }> {
    let worker;
    try {
      this.logger.log(`Extracting text from region for field: ${fieldName}`);

      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      const pngPages = await pdfToPng(arrayBuffer, {
        disableFontFace: true,
        useSystemFonts: true,
        viewportScale: 2.0,
        pagesToProcess: [regionCoordinates.pageNumber],
      });

      if (!pngPages || pngPages.length === 0) {
        return { text: '', confidence: 0 };
      }

      const pageImage = pngPages[0];
      worker = await createWorker('eng');

      const { data } = await worker.recognize(pageImage.content, {
        rectangle: {
          left: Math.floor(regionCoordinates.x),
          top: Math.floor(regionCoordinates.y),
          width: Math.floor(regionCoordinates.width),
          height: Math.floor(regionCoordinates.height),
        },
      });

      await worker.terminate();
      worker = null;

      const text = data.text?.trim() || '';
      const confidence = data.confidence / 100;

      this.logger.log(
        `Extracted from region: "${text}" (confidence: ${confidence})`,
      );
      return { text, confidence };
    } catch (error) {
      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }
      this.logger.error(`Region extraction failed: ${error.message}`);
      return { text: '', confidence: 0 };
    }
  }

  async saveExtractionRegion(
    dto: SaveExtractionRegionDto,
    userId?: number,
  ): Promise<NixExtractionRegion> {
    this.logger.log(
      `Saving extraction region for ${dto.documentCategory}:${dto.fieldName}`,
    );

    const existingRegion = await this.regionRepository.findOne({
      where: {
        documentCategory: dto.documentCategory,
        fieldName: dto.fieldName,
        isActive: true,
      },
    });

    if (existingRegion) {
      existingRegion.regionCoordinates = dto.regionCoordinates;
      existingRegion.extractionPattern = dto.extractionPattern || null;
      existingRegion.sampleValue = dto.sampleValue || null;
      return this.regionRepository.save(existingRegion);
    }

    const region = this.regionRepository.create({
      documentCategory: dto.documentCategory,
      fieldName: dto.fieldName,
      regionCoordinates: dto.regionCoordinates,
      extractionPattern: dto.extractionPattern || null,
      sampleValue: dto.sampleValue || null,
      createdByUserId: userId || null,
    });

    return this.regionRepository.save(region);
  }

  async findRegionsForDocument(
    documentCategory: string,
  ): Promise<NixExtractionRegion[]> {
    return this.regionRepository.find({
      where: {
        documentCategory,
        isActive: true,
      },
      order: {
        fieldName: 'ASC',
      },
    });
  }

  async extractUsingLearnedRegions(
    buffer: Buffer,
    documentCategory: string,
  ): Promise<Map<string, { text: string; confidence: number }>> {
    const regions = await this.findRegionsForDocument(documentCategory);
    const results = new Map<string, { text: string; confidence: number }>();

    if (regions.length === 0) {
      this.logger.log(
        `No learned regions found for document category: ${documentCategory}`,
      );
      return results;
    }

    this.logger.log(
      `Found ${regions.length} learned regions for ${documentCategory}`,
    );

    for (const region of regions) {
      const extracted = await this.extractFromRegion(
        buffer,
        region.regionCoordinates,
        region.fieldName,
      );

      if (
        extracted.text &&
        extracted.confidence >= region.confidenceThreshold
      ) {
        results.set(region.fieldName, extracted);
        region.useCount += 1;
        region.successCount += 1;
        await this.regionRepository.save(region);
      } else {
        region.useCount += 1;
        await this.regionRepository.save(region);
      }
    }

    return results;
  }

  async deleteRegion(id: number): Promise<void> {
    await this.regionRepository.update(id, { isActive: false });
  }

  async allRegions(): Promise<NixExtractionRegion[]> {
    return this.regionRepository.find({
      where: { isActive: true },
      order: { documentCategory: 'ASC', fieldName: 'ASC' },
    });
  }
}
