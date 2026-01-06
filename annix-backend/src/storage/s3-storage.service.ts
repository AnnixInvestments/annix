import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
  BucketLocationConstraint,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, StorageResult } from './storage.interface';

@Injectable()
export class S3StorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly presignedUrlExpiration: number;
  private initialized = false;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'af-south-1';
    this.bucket =
      this.configService.get<string>('AWS_S3_BUCKET') || 'annix-sync-files';
    this.presignedUrlExpiration =
      this.configService.get<number>('AWS_S3_URL_EXPIRATION') || 3600; // 1 hour default

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(
      `S3 Storage Service initialized for bucket: ${this.bucket} in region: ${this.region}`,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket '${this.bucket}' exists and is accessible`);
      this.initialized = true;
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      if (
        s3Error.name === 'NotFound' ||
        s3Error.httpStatusCode === 404 ||
        s3Error.name === 'NoSuchBucket'
      ) {
        this.logger.log(`S3 bucket '${this.bucket}' not found, creating...`);
        await this.createBucket();
      } else {
        this.logger.warn(
          `Could not verify S3 bucket: ${s3Error.message}. Will attempt operations anyway.`,
        );
        this.initialized = true;
      }
    }
  }

  private async createBucket(): Promise<void> {
    try {
      await this.s3Client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
          ...(this.region !== 'us-east-1' && {
            CreateBucketConfiguration: {
              LocationConstraint: this.region as BucketLocationConstraint,
            },
          }),
        }),
      );
      this.logger.log(`S3 bucket '${this.bucket}' created successfully`);

      await this.configureCors();
      this.initialized = true;
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      if (s3Error.name === 'BucketAlreadyOwnedByYou') {
        this.logger.log(
          `S3 bucket '${this.bucket}' already exists (owned by you)`,
        );
        await this.configureCors();
        this.initialized = true;
      } else if (s3Error.name === 'BucketAlreadyExists') {
        this.logger.error(
          `S3 bucket name '${this.bucket}' is already taken globally. Choose a different name.`,
        );
        throw error;
      } else {
        this.logger.error(`Failed to create S3 bucket: ${s3Error.message}`);
        throw error;
      }
    }
  }

  private async configureCors(): Promise<void> {
    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedOrigins: [
                  'http://localhost:3000',
                  'http://localhost:3001',
                  'https://*.annix.co.za',
                ],
                ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`CORS configured for bucket '${this.bucket}'`);
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      this.logger.warn(`Could not configure CORS: ${s3Error.message}`);
    }
  }

  private parseS3Error(error: unknown): {
    name: string;
    message: string;
    httpStatusCode?: number;
  } {
    if (error instanceof Error) {
      const s3Error = error as Error & {
        $metadata?: { httpStatusCode?: number };
      };
      return {
        name: error.name,
        message: error.message,
        httpStatusCode: s3Error.$metadata?.httpStatusCode,
      };
    }
    return { name: 'Unknown', message: String(error) };
  }

  async upload(
    file: Express.Multer.File,
    subPath: string,
  ): Promise<StorageResult> {
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
    const uniqueFilename = `${uuidv4()}${ext}`;
    const key = `${subPath}/${uniqueFilename}`
      .replace(/\\/g, '/')
      .replace(/^\//, '');

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
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      this.logger.error(`Failed to upload file to S3: ${s3Error.message}`);
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

      const chunks: Uint8Array[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const s3Error = this.parseS3Error(error);
      if (s3Error.name === 'NoSuchKey' || s3Error.httpStatusCode === 404) {
        throw new NotFoundException(`File not found: ${path}`);
      }
      this.logger.error(`Failed to download file from S3: ${s3Error.message}`);
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
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      this.logger.error(`Failed to delete file from S3: ${s3Error.message}`);
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
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      if (s3Error.name === 'NotFound' || s3Error.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(
        `Failed to check file existence in S3: ${s3Error.message}`,
      );
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
    } catch (error: unknown) {
      const s3Error = this.parseS3Error(error);
      this.logger.error(`Failed to generate presigned URL: ${s3Error.message}`);
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
