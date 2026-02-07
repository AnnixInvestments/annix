import * as fs from "node:fs";
import * as path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { now, nowISO } from "../lib/datetime";
import { S3StorageService } from "../storage/s3-storage.service";
import { User } from "../user/entities/user.entity";
import { decrypt, encrypt } from "./crypto.util";
import { CreateSecureDocumentDto } from "./dto/create-secure-document.dto";
import { UpdateSecureDocumentDto } from "./dto/update-secure-document.dto";
import { SecureDocument } from "./secure-document.entity";
import { EntityType, SecureEntityFolder } from "./secure-entity-folder.entity";

export interface LocalDocument {
  slug: string;
  title: string;
  description: string;
  filePath: string;
  updatedAt: Date;
  isLocal: true;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

@Injectable()
export class SecureDocumentsService {
  private readonly logger = new Logger(SecureDocumentsService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucket: string;
  private readonly encryptionKey: string;
  private readonly projectRoot: string;
  private readonly useLocalStorage: boolean;
  private readonly localStoragePath: string;

  constructor(
    @InjectRepository(SecureDocument)
    private readonly documentRepo: Repository<SecureDocument>,
    @InjectRepository(SecureEntityFolder)
    private readonly entityFolderRepo: Repository<SecureEntityFolder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
    private readonly s3StorageService: S3StorageService,
  ) {
    const region = this.configService.get<string>("AWS_REGION") || "af-south-1";
    this.bucket = this.configService.get<string>("AWS_S3_BUCKET") || "annix-sync-files";
    this.encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY") || "";
    const dockerDocsPath = path.join(process.cwd(), "project-docs");
    if (fs.existsSync(dockerDocsPath)) {
      this.projectRoot = dockerDocsPath;
    } else {
      this.projectRoot = path.resolve(process.cwd(), "..");
    }

    const awsAccessKey = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const awsSecretKey = this.configService.get<string>("AWS_SECRET_ACCESS_KEY");
    this.useLocalStorage = !awsAccessKey || !awsSecretKey;
    this.localStoragePath = path.join(process.cwd(), "secure-documents-storage");

    if (this.useLocalStorage) {
      this.s3Client = null;
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
      this.logger.log("SecureDocumentsService using LOCAL storage");
    } else {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: awsAccessKey || "",
          secretAccessKey: awsSecretKey || "",
        },
      });
      this.logger.log(`SecureDocumentsService using S3 storage (bucket: ${this.bucket})`);
    }

    if (!this.encryptionKey) {
      this.logger.warn("DOCUMENT_ENCRYPTION_KEY not set - secure documents will not work");
    }
  }

  async findAll(): Promise<SecureDocument[]> {
    return this.documentRepo.find({
      relations: ["createdBy"],
      order: { updatedAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<SecureDocument> {
    const document = await this.documentRepo.findOne({
      where: { id },
      relations: ["createdBy"],
    });
    if (!document) {
      throw new NotFoundException(`Secure document #${id} not found`);
    }
    return document;
  }

  async findBySlug(slug: string): Promise<SecureDocument> {
    const document = await this.documentRepo.findOne({
      where: { slug },
      relations: ["createdBy"],
    });
    if (!document) {
      throw new NotFoundException(`Secure document with slug "${slug}" not found`);
    }
    return document;
  }

  async findOneWithContent(id: string): Promise<SecureDocument & { content: string }> {
    const document = await this.findOne(id);
    const content = await this.downloadAndDecrypt(document.storagePath);
    return { ...document, content };
  }

  async findBySlugWithContent(slug: string): Promise<SecureDocument & { content: string }> {
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

  async create(dto: CreateSecureDocumentDto, userId: number): Promise<SecureDocument> {
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
      folder: dto.folder || null,
      storagePath,
      fileType: dto.fileType || "markdown",
      originalFilename: dto.originalFilename || null,
      attachmentPath: dto.attachmentPath || null,
      createdBy: user,
    });

    const saved = await this.documentRepo.save(document);
    this.logger.log(`Created secure document: ${saved.id} (${slug}) by user ${userId}`);
    return saved;
  }

  async update(id: string, dto: UpdateSecureDocumentDto): Promise<SecureDocument> {
    const document = await this.findOne(id);

    if (dto.title !== undefined && dto.title !== document.title) {
      document.title = dto.title;
      document.slug = await this.generateUniqueSlug(dto.title);
    }

    if (dto.description !== undefined) {
      document.description = dto.description;
    }

    if (dto.folder !== undefined) {
      document.folder = dto.folder || null;
    }

    if (dto.content !== undefined) {
      await this.deleteFromStorage(document.storagePath);
      document.storagePath = await this.encryptAndUpload(dto.content);
    }

    const updated = await this.documentRepo.save(document);
    this.logger.log(`Updated secure document: ${id} (${document.slug})`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    await this.deleteFromStorage(document.storagePath);
    await this.documentRepo.remove(document);
    this.logger.log(`Deleted secure document: ${id}`);
  }

  private async encryptAndUpload(content: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException("Encryption key not configured");
    }

    const encrypted = encrypt(content, this.encryptionKey);
    const key = `secure-documents/${uuidv4()}.enc`;

    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, `${uuidv4()}.enc`);
      await fs.promises.writeFile(filePath, encrypted);
      this.logger.log(`Saved encrypted document locally: ${filePath}`);
      return `local:${path.basename(filePath)}`;
    }

    if (!this.s3Client) {
      throw new InternalServerErrorException("S3 client not configured");
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
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
      throw new InternalServerErrorException("Encryption key not configured");
    }

    if (this.useLocalStorage || storagePath.startsWith("local:")) {
      const fileName = storagePath.replace("local:", "");
      const filePath = path.join(this.localStoragePath, fileName);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`File not found: ${storagePath}`);
      }
      const encrypted = await fs.promises.readFile(filePath);
      return decrypt(encrypted, this.encryptionKey);
    }

    if (!this.s3Client) {
      throw new InternalServerErrorException("S3 client not configured");
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

  private async deleteFromStorage(storagePath: string): Promise<void> {
    if (this.useLocalStorage || storagePath.startsWith("local:")) {
      const fileName = storagePath.replace("local:", "");
      const filePath = path.join(this.localStoragePath, fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted encrypted document locally: ${filePath}`);
      }
      return;
    }

    if (!this.s3Client) {
      throw new InternalServerErrorException("S3 client not configured");
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      }),
    );
    this.logger.log(`Deleted encrypted document from S3: ${storagePath}`);
  }

  async listLocalMarkdownFiles(): Promise<LocalDocument[]> {
    const readmes: LocalDocument[] = [];
    await this.scanForMarkdownFiles(this.projectRoot, readmes, 0);
    return readmes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private async scanForMarkdownFiles(
    dir: string,
    results: LocalDocument[],
    depth: number,
  ): Promise<void> {
    if (depth > 3) return;

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
            continue;
          }
          await this.scanForMarkdownFiles(fullPath, results, depth + 1);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          const stats = await fs.promises.stat(fullPath);
          const relativePath = path.relative(this.projectRoot, fullPath);
          const fileName = path.basename(relativePath, ".md");
          const dirName = path.dirname(relativePath);

          const title =
            dirName === "."
              ? fileName.replace(/[-_]/g, " ")
              : `${dirName.replace(/\//g, " / ")} / ${fileName.replace(/[-_]/g, " ")}`;

          const slug = `local:${slugify(relativePath.replace(/\//g, "-").replace(/\.md$/i, ""))}`;

          results.push({
            slug,
            title,
            description: `Local file: ${relativePath}`,
            filePath: relativePath,
            updatedAt: stats.mtime,
            isLocal: true,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Error scanning directory ${dir}: ${err}`);
    }
  }

  async readLocalReadme(filePath: string): Promise<{ content: string; document: LocalDocument }> {
    const fullPath = path.join(this.projectRoot, filePath);

    if (!fullPath.startsWith(this.projectRoot)) {
      throw new NotFoundException("Invalid file path");
    }

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    const stats = await fs.promises.stat(fullPath);
    const content = await fs.promises.readFile(fullPath, "utf-8");
    const relativePath = path.relative(this.projectRoot, fullPath);
    const dirName = path.dirname(relativePath);

    const title = dirName === "." ? "Project README" : `${dirName.replace(/\//g, " / ")} README`;

    const slug = `local:${slugify(relativePath.replace(/\//g, "-").replace(/\.md$/i, ""))}`;

    const document: LocalDocument = {
      slug,
      title,
      description: `Local file: ${relativePath}`,
      filePath: relativePath,
      updatedAt: stats.mtime,
      isLocal: true,
    };

    return { content, document };
  }

  async attachmentDownloadUrl(id: string): Promise<{ url: string; filename: string }> {
    const document = await this.findOne(id);

    if (!document.attachmentPath) {
      throw new NotFoundException(`Document #${id} has no attachment`);
    }

    const url = await this.s3StorageService.getPresignedUrl(document.attachmentPath, 3600);

    return {
      url,
      filename: document.originalFilename || "download",
    };
  }

  async createEntityFolder(
    entityType: EntityType,
    entityId: number,
    companyName: string,
  ): Promise<SecureEntityFolder> {
    const existingFolder = await this.entityFolderRepo.findOne({
      where: { entityType, entityId },
    });

    if (existingFolder) {
      this.logger.log(`Entity folder already exists for ${entityType} ${entityId}`);
      return existingFolder;
    }

    const sanitizedName = companyName.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    const folderName = `${sanitizedName} (ID: ${entityId})`;
    const parentFolder = entityType === "customer" ? "Customers" : "Suppliers";
    const secureFolderPath = `${parentFolder}/${folderName}`;

    const folder = this.entityFolderRepo.create({
      entityType,
      entityId,
      folderName,
      secureFolderPath,
      isActive: true,
    });

    const savedFolder = await this.entityFolderRepo.save(folder);
    this.logger.log(`Created entity folder: ${secureFolderPath} for ${entityType} ${entityId}`);
    return savedFolder;
  }

  async entityFolder(entityType: EntityType, entityId: number): Promise<SecureEntityFolder | null> {
    return this.entityFolderRepo.findOne({
      where: { entityType, entityId },
    });
  }

  async deactivateEntityFolder(
    entityType: EntityType,
    entityId: number,
    reason: string,
  ): Promise<void> {
    const folder = await this.entityFolderRepo.findOne({
      where: { entityType, entityId },
    });

    if (!folder) {
      this.logger.warn(`No entity folder found for ${entityType} ${entityId} to deactivate`);
      return;
    }

    folder.isActive = false;
    folder.deletedAt = now().toJSDate();
    folder.deletionReason = reason;

    await this.entityFolderRepo.save(folder);
    this.logger.log(`Deactivated entity folder for ${entityType} ${entityId}: ${reason}`);
  }

  async reactivateEntityFolder(entityType: EntityType, entityId: number): Promise<void> {
    const folder = await this.entityFolderRepo.findOne({
      where: { entityType, entityId },
    });

    if (!folder) {
      this.logger.warn(`No entity folder found for ${entityType} ${entityId} to reactivate`);
      return;
    }

    folder.isActive = true;
    folder.deletedAt = null;
    folder.deletionReason = null;

    await this.entityFolderRepo.save(folder);
    this.logger.log(`Reactivated entity folder for ${entityType} ${entityId}`);
  }

  async listEntityFolderDocuments(
    entityType: EntityType,
    entityId: number,
  ): Promise<SecureDocument[]> {
    const folder = await this.entityFolderRepo.findOne({
      where: { entityType, entityId },
    });

    if (!folder) {
      return [];
    }

    return this.documentRepo.find({
      where: { folder: folder.secureFolderPath },
      relations: ["createdBy"],
      order: { updatedAt: "DESC" },
    });
  }

  async listAllEntityFolders(
    entityType?: EntityType,
    activeOnly: boolean = true,
  ): Promise<SecureEntityFolder[]> {
    const whereClause: any = {};
    if (entityType) {
      whereClause.entityType = entityType;
    }
    if (activeOnly) {
      whereClause.isActive = true;
    }

    return this.entityFolderRepo.find({
      where: whereClause,
      order: { createdAt: "DESC" },
    });
  }

  async createFromEntityDocument(
    entityType: EntityType,
    entityId: number,
    documentType: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    userId: number,
  ): Promise<SecureDocument> {
    const folder = await this.entityFolder(entityType, entityId);
    if (!folder) {
      throw new NotFoundException(`Secure folder not found for ${entityType} ${entityId}`);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    const title = this.documentTypeToTitle(documentType);
    const baseSlug = slugify(`${folder.folderName}-${documentType}`);
    const slug = await this.generateUniqueSlug(baseSlug);

    const storagePath = await this.encryptAndUploadBuffer(fileBuffer);
    const fileType = this.mimeToFileType(mimeType);

    const document = this.documentRepo.create({
      title,
      slug,
      description: `${title} for ${folder.folderName}`,
      folder: folder.secureFolderPath,
      storagePath,
      fileType,
      originalFilename,
      createdBy: user,
    });

    const saved = await this.documentRepo.save(document);
    this.logger.log(`Created secure document from ${entityType} upload: ${saved.id} (${slug})`);
    return saved;
  }

  private async encryptAndUploadBuffer(buffer: Buffer): Promise<string> {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException("Encryption key not configured");
    }

    const content = buffer.toString("base64");
    const encrypted = encrypt(content, this.encryptionKey);
    const key = `secure-documents/${uuidv4()}.enc`;

    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, `${uuidv4()}.enc`);
      await fs.promises.writeFile(filePath, encrypted);
      this.logger.log(`Saved encrypted document locally: ${filePath}`);
      return `local:${path.basename(filePath)}`;
    }

    if (!this.s3Client) {
      throw new InternalServerErrorException("S3 client not configured");
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
        Metadata: {
          uploadedAt: nowISO(),
        },
      }),
    );

    this.logger.log(`Uploaded encrypted document to S3: ${key}`);
    return key;
  }

  private documentTypeToTitle(documentType: string): string {
    const typeMap: Record<string, string> = {
      registration_cert: "Company Registration Certificate",
      vat_cert: "VAT Registration Certificate",
      bee_cert: "BEE Certificate",
      tax_clearance: "Tax Clearance Certificate",
      iso_cert: "ISO Certificate",
      insurance: "Insurance Certificate",
      other: "Other Document",
    };
    return typeMap[documentType] || documentType.replace(/_/g, " ");
  }

  private mimeToFileType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "image",
      "image/jpg": "image",
      "image/png": "image",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
      "application/vnd.ms-excel": "excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
      "application/msword": "word",
    };
    return mimeMap[mimeType] || "other";
  }
}
