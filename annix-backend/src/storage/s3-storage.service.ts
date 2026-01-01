import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, StorageResult } from './storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly presignedUrlExpiration: number;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'af-south-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'annix-sync-files';
    this.presignedUrlExpiration = this.configService.get<number>('AWS_S3_URL_EXPIRATION') || 3600; // 1 hour default

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(`S3 Storage Service initialized for bucket: ${this.bucket} in region: ${this.region}`);
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<StorageResult> {
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
    const uniqueFilename = `${uuidv4()}${ext}`;
    const key = `${subPath}/${uniqueFilename}`.replace(/\\/g, '/').replace(/^\//, '');

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalFilename: encodeURIComponent(file.originalname),
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully to S3: ${key}`);

      return {
        path: key,
        url: await this.getPresignedUrl(key),
        size: file.size,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  async download(path: string): Promise<Buffer> {
    const key = path.replace(/\\/g, '/').replace(/^\//, '');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new NotFoundException(`File not found: ${path}`);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException(`File not found: ${path}`);
      }
      this.logger.error(`Failed to download file from S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    const key = path.replace(/\\/g, '/').replace(/^\//, '');

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    const key = path.replace(/\\/g, '/').replace(/^\//, '');

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`Failed to check file existence in S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  getPublicUrl(path: string): string {
    // For S3, we return a presigned URL that expires
    // This is synchronous but returns a placeholder - use getPresignedUrl for actual URLs
    const key = path.replace(/\\/g, '/').replace(/^\//, '');
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Generate a presigned URL for secure, time-limited access to the file
   * @param path - The S3 key of the file
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   */
  async getPresignedUrl(path: string, expiresIn?: number): Promise<string> {
    const key = path.replace(/\\/g, '/').replace(/^\//, '');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresIn || this.presignedUrlExpiration,
      });

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get the S3 bucket name
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Get the AWS region
   */
  getRegion(): string {
    return this.region;
  }
}
