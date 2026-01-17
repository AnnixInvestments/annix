import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { SecureDocument } from './secure-document.entity';
import { CreateSecureDocumentDto } from './dto/create-secure-document.dto';
import { UpdateSecureDocumentDto } from './dto/update-secure-document.dto';
import { encrypt, decrypt } from './crypto.util';
import { User } from '../user/entities/user.entity';
import { nowISO } from '../lib/datetime';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class SecureDocumentsService {
  private readonly logger = new Logger(SecureDocumentsService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(SecureDocument)
    private readonly documentRepo: Repository<SecureDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION') || 'af-south-1';
    this.bucket =
      this.configService.get<string>('AWS_S3_BUCKET') || 'annix-sync-files';
    this.encryptionKey =
      this.configService.get<string>('DOCUMENT_ENCRYPTION_KEY') || '';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    if (!this.encryptionKey) {
      this.logger.warn(
        'DOCUMENT_ENCRYPTION_KEY not set - secure documents will not work',
      );
    }
  }

  async findAll(): Promise<SecureDocument[]> {
    return this.documentRepo.find({
      relations: ['createdBy'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SecureDocument> {
    const document = await this.documentRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!document) {
      throw new NotFoundException(`Secure document #${id} not found`);
    }
    return document;
  }

  async findBySlug(slug: string): Promise<SecureDocument> {
    const document = await this.documentRepo.findOne({
      where: { slug },
      relations: ['createdBy'],
    });
    if (!document) {
      throw new NotFoundException(`Secure document with slug "${slug}" not found`);
    }
    return document;
  }

  async findOneWithContent(
    id: string,
  ): Promise<SecureDocument & { content: string }> {
    const document = await this.findOne(id);
    const content = await this.downloadAndDecrypt(document.storagePath);
    return { ...document, content };
  }

  async findBySlugWithContent(
    slug: string,
  ): Promise<SecureDocument & { content: string }> {
    const document = await this.findBySlug(slug);
    const content = await this.downloadAndDecrypt(document.storagePath);
    return { ...document, content };
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.documentRepo.findOne({ where: { slug } });
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async create(
    dto: CreateSecureDocumentDto,
    userId: number,
  ): Promise<SecureDocument> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    const slug = await this.generateUniqueSlug(dto.title);
    const storagePath = await this.encryptAndUpload(dto.content);

    const document = this.documentRepo.create({
      title: dto.title,
      slug,
      description: dto.description,
      storagePath,
      createdBy: user,
    });

    const saved = await this.documentRepo.save(document);
    this.logger.log(`Created secure document: ${saved.id} (${slug}) by user ${userId}`);
    return saved;
  }

  async update(
    id: string,
    dto: UpdateSecureDocumentDto,
  ): Promise<SecureDocument> {
    const document = await this.findOne(id);

    if (dto.title !== undefined && dto.title !== document.title) {
      document.title = dto.title;
      document.slug = await this.generateUniqueSlug(dto.title);
    }

    if (dto.description !== undefined) {
      document.description = dto.description;
    }

    if (dto.content !== undefined) {
      await this.deleteFromS3(document.storagePath);
      document.storagePath = await this.encryptAndUpload(dto.content);
    }

    const updated = await this.documentRepo.save(document);
    this.logger.log(`Updated secure document: ${id} (${document.slug})`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    await this.deleteFromS3(document.storagePath);
    await this.documentRepo.remove(document);
    this.logger.log(`Deleted secure document: ${id}`);
  }

  private async encryptAndUpload(content: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException('Encryption key not configured');
    }

    const encrypted = encrypt(content, this.encryptionKey);
    const key = `secure-documents/${uuidv4()}.enc`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: encrypted,
        ContentType: 'application/octet-stream',
        Metadata: {
          uploadedAt: nowISO(),
        },
      }),
    );

    this.logger.log(`Uploaded encrypted document to S3: ${key}`);
    return key;
  }

  private async downloadAndDecrypt(storagePath: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException('Encryption key not configured');
    }

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      }),
    );

    if (!response.Body) {
      throw new NotFoundException(`File not found: ${storagePath}`);
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const encrypted = Buffer.concat(chunks);
    return decrypt(encrypted, this.encryptionKey);
  }

  private async deleteFromS3(storagePath: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      }),
    );
    this.logger.log(`Deleted encrypted document from S3: ${storagePath}`);
  }
}
