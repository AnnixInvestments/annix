import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  NixExtractionRegion,
  RegionCoordinates,
} from '../entities/nix-extraction-region.entity';
import {
  SaveExtractionRegionDto,
  PdfPagesResponseDto,
  PdfPageImageDto,
} from '../dto/extraction-region.dto';

const execAsync = promisify(exec);

@Injectable()
export class DocumentAnnotationService {
  private readonly logger = new Logger(DocumentAnnotationService.name);

  constructor(
    @InjectRepository(NixExtractionRegion)
    private readonly regionRepository: Repository<NixExtractionRegion>,
  ) {}

  private normalizeDocumentCategory(category: string): string {
    return category.toLowerCase().replace('_cert', '');
  }

  async convertPdfToImages(
    buffer: Buffer,
    scale: number = 2.0,
  ): Promise<PdfPagesResponseDto> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nix-pdf-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPattern = path.join(tempDir, 'page-%d.png');

    try {
      this.logger.log('Converting PDF to images for annotation view using Ghostscript');

      await fs.writeFile(inputPath, buffer);

      const dpi = Math.round(150 * scale);
      const gsCommand =
        process.platform === 'win32'
          ? '"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"'
          : 'gs';
      const command = `${gsCommand} -dNOPAUSE -dBATCH -dSAFER -sDEVICE=png16m -r${dpi} -dTextAlphaBits=4 -dGraphicsAlphaBits=4 "-sOutputFile=${outputPattern}" "${inputPath}"`;

      this.logger.log(`Running Ghostscript command`);

      await execAsync(command, { timeout: 60000 });

      const files = await fs.readdir(tempDir);
      const pngFiles = files
        .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0');
          const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0');
          return numA - numB;
        });

      if (pngFiles.length === 0) {
        this.logger.warn('PDF conversion returned no pages');
        return { totalPages: 0, pages: [] };
      }

      const pages: PdfPageImageDto[] = [];
      for (let i = 0; i < pngFiles.length; i++) {
        const filePath = path.join(tempDir, pngFiles[i]);
        const imageBuffer = await fs.readFile(filePath);
        const metadata = await sharp(imageBuffer).metadata();

        pages.push({
          pageNumber: i + 1,
          imageData: imageBuffer.toString('base64'),
          width: metadata.width || 0,
          height: metadata.height || 0,
        });
      }

      this.logger.log(`Converted PDF to ${pages.length} images`);
      return { totalPages: pages.length, pages };
    } catch (error) {
      this.logger.error(`Failed to convert PDF to images: ${error.message}`);
      this.logger.warn(
        'PDF may contain unsupported graphics. Returning empty pages.',
      );
      return { totalPages: 0, pages: [] };
    } finally {
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file));
        }
        await fs.rmdir(tempDir);
      } catch {
        this.logger.warn('Failed to clean up temp directory');
      }
    }
  }

  async extractFromRegion(
    buffer: Buffer,
    regionCoordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<{ text: string; confidence: number }> {
    let worker;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nix-ocr-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPath = path.join(tempDir, 'page.png');

    try {
      this.logger.log(`[extractFromRegion] Starting extraction for field: ${fieldName}`);
      this.logger.log(`[extractFromRegion] Coordinates: ${JSON.stringify(regionCoordinates)}`);
      this.logger.log(`[extractFromRegion] Buffer type: ${typeof buffer}, isBuffer: ${Buffer.isBuffer(buffer)}, length: ${buffer?.length ?? 'undefined'}`);

      if (!buffer || !Buffer.isBuffer(buffer)) {
        this.logger.error(`[extractFromRegion] Invalid buffer provided for field ${fieldName}`);
        return { text: '', confidence: 0 };
      }

      await fs.writeFile(inputPath, buffer);
      this.logger.log(`[extractFromRegion] Wrote PDF to ${inputPath}, size: ${buffer.length} bytes`);

      const gsCommand =
        process.platform === 'win32'
          ? '"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"'
          : 'gs';
      const extractionDpi = 300;
      const command = `${gsCommand} -dNOPAUSE -dBATCH -dSAFER -sDEVICE=png16m -r${extractionDpi} -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage=${regionCoordinates.pageNumber} -dLastPage=${regionCoordinates.pageNumber} "-sOutputFile=${outputPath}" "${inputPath}"`;

      this.logger.log(`[extractFromRegion] Running Ghostscript command for page ${regionCoordinates.pageNumber}`);
      this.logger.log(`[extractFromRegion] GS command: ${command}`);

      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      this.logger.log(`[extractFromRegion] Ghostscript completed, stdout: ${stdout?.substring(0, 200) || 'empty'}`);
      if (stderr) {
        this.logger.warn(`[extractFromRegion] Ghostscript stderr: ${stderr}`);
      }

      const outputExists = await fs.access(outputPath).then(() => true).catch(() => false);
      this.logger.log(`[extractFromRegion] Output file exists: ${outputExists}`);
      if (!outputExists) {
        this.logger.error(`[extractFromRegion] Ghostscript did not create output file at ${outputPath}`);
        return { text: '', confidence: 0 };
      }

      const pageImageBuffer = await fs.readFile(outputPath);
      this.logger.log(`[extractFromRegion] Page image buffer size: ${pageImageBuffer.length} bytes`);

      const imageMetadata = await sharp(pageImageBuffer).metadata();
      this.logger.log(`[extractFromRegion] Image dimensions: ${imageMetadata.width}x${imageMetadata.height}`);
      this.logger.log(`[extractFromRegion] Region to extract: x=${regionCoordinates.x}, y=${regionCoordinates.y}, w=${regionCoordinates.width}, h=${regionCoordinates.height}`);

      const imgWidth = imageMetadata.width || 0;
      const imgHeight = imageMetadata.height || 0;
      const regionRight = regionCoordinates.x + regionCoordinates.width;
      const regionBottom = regionCoordinates.y + regionCoordinates.height;

      if (regionCoordinates.x < 0 || regionCoordinates.y < 0 || regionRight > imgWidth || regionBottom > imgHeight) {
        this.logger.warn(`[extractFromRegion] Region extends beyond image bounds! Region: (${regionCoordinates.x},${regionCoordinates.y}) to (${regionRight},${regionBottom}), Image: ${imgWidth}x${imgHeight}`);
      }

      this.logger.log(`[extractFromRegion] Creating Tesseract worker...`);
      worker = await createWorker('eng');
      this.logger.log(`[extractFromRegion] Tesseract worker created`);

      const rectangle = {
        left: Math.floor(regionCoordinates.x),
        top: Math.floor(regionCoordinates.y),
        width: Math.floor(regionCoordinates.width),
        height: Math.floor(regionCoordinates.height),
      };
      this.logger.log(`[extractFromRegion] OCR rectangle: ${JSON.stringify(rectangle)}`);

      const { data } = await worker.recognize(pageImageBuffer, { rectangle });
      this.logger.log(`[extractFromRegion] Tesseract recognition complete`);

      await worker.terminate();
      worker = null;

      const text = data.text?.trim() || '';
      const confidence = data.confidence / 100;

      this.logger.log(`[extractFromRegion] Extracted text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      this.logger.log(`[extractFromRegion] Confidence: ${confidence}`);
      return { text, confidence };
    } catch (error) {
      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }
      this.logger.error(`[extractFromRegion] FAILED for ${fieldName}: ${error.message}`);
      this.logger.error(`[extractFromRegion] Error stack: ${error.stack}`);
      return { text: '', confidence: 0 };
    } finally {
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file));
        }
        await fs.rmdir(tempDir);
      } catch {
        this.logger.warn('Failed to clean up temp directory');
      }
    }
  }

  async saveExtractionRegion(
    dto: SaveExtractionRegionDto,
    userId?: number,
  ): Promise<NixExtractionRegion> {
    const normalizedCategory = this.normalizeDocumentCategory(dto.documentCategory);
    this.logger.log(
      `Saving extraction region for ${normalizedCategory}:${dto.fieldName}`,
    );

    const existingRegion = await this.regionRepository.findOne({
      where: {
        documentCategory: normalizedCategory,
        fieldName: dto.fieldName,
        isActive: true,
      },
    });

    if (existingRegion) {
      existingRegion.regionCoordinates = dto.regionCoordinates;
      existingRegion.labelCoordinates = dto.labelCoordinates || null;
      existingRegion.labelText = dto.labelText || null;
      existingRegion.extractionPattern = dto.extractionPattern || null;
      existingRegion.sampleValue = dto.sampleValue || null;
      existingRegion.isCustomField = dto.isCustomField ?? existingRegion.isCustomField;
      return this.regionRepository.save(existingRegion);
    }

    const region = this.regionRepository.create({
      documentCategory: normalizedCategory,
      fieldName: dto.fieldName,
      regionCoordinates: dto.regionCoordinates,
      labelCoordinates: dto.labelCoordinates || null,
      labelText: dto.labelText || null,
      extractionPattern: dto.extractionPattern || null,
      sampleValue: dto.sampleValue || null,
      isCustomField: dto.isCustomField ?? false,
      createdByUserId: userId || null,
    });

    return this.regionRepository.save(region);
  }

  async findRegionsForDocument(
    documentCategory: string,
  ): Promise<NixExtractionRegion[]> {
    const normalizedCategory = this.normalizeDocumentCategory(documentCategory);
    return this.regionRepository.find({
      where: {
        documentCategory: normalizedCategory,
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

      this.logger.log(
        `Region extraction for ${region.fieldName}: text="${extracted.text?.substring(0, 50) || ''}", confidence=${extracted.confidence.toFixed(2)}, threshold=${region.confidenceThreshold}`,
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
        this.logger.warn(
          `Region extraction failed for ${region.fieldName}: ${!extracted.text ? 'empty text' : `confidence ${extracted.confidence.toFixed(2)} below threshold ${region.confidenceThreshold}`}`,
        );
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
