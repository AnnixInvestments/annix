import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, StorageResult } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
    this.baseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:4001';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<StorageResult> {
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${ext}`;
    const relativePath = path.join(subPath, uniqueFilename);
    const fullPath = path.join(this.uploadDir, relativePath);
    const dirPath = path.dirname(fullPath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write file
    await fs.promises.writeFile(fullPath, file.buffer);

    return {
      path: relativePath.replace(/\\/g, '/'), // Normalize path separators
      url: this.getPublicUrl(relativePath),
      size: file.size,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    };
  }

  async download(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, relativePath);

    if (!await this.exists(relativePath)) {
      throw new NotFoundException(`File not found: ${relativePath}`);
    }

    return fs.promises.readFile(fullPath);
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, relativePath);

    if (await this.exists(relativePath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, relativePath);

    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(relativePath: string): string {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return `${this.baseUrl}/api/files/${normalizedPath}`;
  }

  getFullPath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }
}
