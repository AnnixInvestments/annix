import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface CompressionResult {
  compressedBuffer: Buffer;
  compressedSize: number;
  originalSize: number;
  compressionRatio: number;
  compressedMimeType: string;
}

@Injectable()
export class DocumentCompressionService {
  private readonly logger = new Logger(DocumentCompressionService.name);

  private readonly imageQuality = 80;
  private readonly maxImageWidth = 2048;
  private readonly maxImageHeight = 2048;

  async compressDocument(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<CompressionResult | null> {
    const originalSize = buffer.length;

    if (mimeType.startsWith('image/')) {
      return this.compressImage(buffer, mimeType, originalSize);
    }

    if (mimeType === 'application/pdf') {
      return {
        compressedBuffer: buffer,
        compressedSize: originalSize,
        originalSize,
        compressionRatio: 1,
        compressedMimeType: mimeType,
      };
    }

    this.logger.log(`Unsupported mime type for compression: ${mimeType}`);
    return null;
  }

  private async compressImage(
    buffer: Buffer,
    mimeType: string,
    originalSize: number,
  ): Promise<CompressionResult> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      let processedImage = image;

      if (
        (metadata.width && metadata.width > this.maxImageWidth) ||
        (metadata.height && metadata.height > this.maxImageHeight)
      ) {
        processedImage = processedImage.resize(
          this.maxImageWidth,
          this.maxImageHeight,
          {
            fit: 'inside',
            withoutEnlargement: true,
          },
        );
      }

      let compressedBuffer: Buffer;
      let compressedMimeType: string;

      compressedBuffer = await processedImage
        .webp({ quality: this.imageQuality })
        .toBuffer();
      compressedMimeType = 'image/webp';

      const webpSize = compressedBuffer.length;

      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        const jpegBuffer = await processedImage
          .jpeg({ quality: this.imageQuality, progressive: true })
          .toBuffer();

        if (jpegBuffer.length < webpSize) {
          compressedBuffer = jpegBuffer;
          compressedMimeType = 'image/jpeg';
        }
      }

      if (mimeType === 'image/png') {
        const pngBuffer = await processedImage
          .png({ compressionLevel: 9 })
          .toBuffer();

        if (pngBuffer.length < webpSize) {
          compressedBuffer = pngBuffer;
          compressedMimeType = 'image/png';
        }
      }

      const compressionRatio =
        originalSize > 0 ? compressedBuffer.length / originalSize : 1;

      this.logger.log(
        `Image compressed: ${originalSize} -> ${compressedBuffer.length} bytes (${(compressionRatio * 100).toFixed(1)}%)`,
      );

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        originalSize,
        compressionRatio,
        compressedMimeType,
      };
    } catch (error) {
      this.logger.error(`Image compression failed: ${error.message}`);
      return {
        compressedBuffer: buffer,
        compressedSize: originalSize,
        originalSize,
        compressionRatio: 1,
        compressedMimeType: mimeType,
      };
    }
  }

  async saveCompressedFile(
    buffer: Buffer,
    originalFilePath: string,
    compressedMimeType: string,
  ): Promise<string> {
    const ext = this.mimeToExtension(compressedMimeType);
    const baseName = path.basename(
      originalFilePath,
      path.extname(originalFilePath),
    );
    const dirName = path.dirname(originalFilePath);
    const compressedPath = path.join(dirName, `${baseName}_compressed${ext}`);

    await fs.writeFile(compressedPath, buffer);

    return compressedPath;
  }

  private mimeToExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/webp': '.webp',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
    };

    return mimeMap[mimeType] || '';
  }

  extensionToMime(ext: string): string {
    const extMap: Record<string, string> = {
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
    };

    return extMap[ext.toLowerCase()] || 'application/octet-stream';
  }
}
