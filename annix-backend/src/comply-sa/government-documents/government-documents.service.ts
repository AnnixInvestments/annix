import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { ComplySaGovernmentDocument } from "./entities/government-document.entity";

const PRESIGNED_URL_TTL_SECONDS = 3600;

type CategoryGroup = {
  key: string;
  label: string;
  department: string | null;
  departmentUrl: string | null;
  documents: Array<{
    id: number;
    name: string;
    description: string;
    downloadUrl: string;
    synced: boolean;
  }>;
};

@Injectable()
export class ComplySaGovernmentDocumentsService {
  private readonly logger = new Logger(ComplySaGovernmentDocumentsService.name);

  constructor(
    @InjectRepository(ComplySaGovernmentDocument)
    private readonly repository: Repository<ComplySaGovernmentDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async listGroupedByCategory(): Promise<CategoryGroup[]> {
    const documents = await this.repository.find({
      order: { category: "ASC", sortOrder: "ASC" },
    });

    const categoryMap = new Map<string, CategoryGroup>();

    const withUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl =
          doc.synced && doc.filePath !== null
            ? await this.storageService
                .presignedUrl(doc.filePath, PRESIGNED_URL_TTL_SECONDS)
                .catch(() => doc.sourceUrl)
            : doc.sourceUrl;

        return { doc, downloadUrl };
      }),
    );

    withUrls.forEach(({ doc, downloadUrl }) => {
      const existing = categoryMap.get(doc.category);

      if (existing) {
        existing.documents.push({
          id: doc.id,
          name: doc.name,
          description: doc.description,
          downloadUrl,
          synced: doc.synced,
        });
      } else {
        categoryMap.set(doc.category, {
          key: doc.category,
          label: doc.categoryLabel,
          department: doc.department,
          departmentUrl: doc.departmentUrl,
          documents: [
            {
              id: doc.id,
              name: doc.name,
              description: doc.description,
              downloadUrl,
              synced: doc.synced,
            },
          ],
        });
      }
    });

    return Array.from(categoryMap.values());
  }

  async documentDownloadUrl(documentId: number): Promise<string> {
    const doc = await this.repository.findOne({ where: { id: documentId } });

    if (doc === null) {
      throw new NotFoundException("Government document not found");
    }

    if (doc.synced && doc.filePath !== null) {
      return this.storageService.presignedUrl(doc.filePath, PRESIGNED_URL_TTL_SECONDS);
    }

    return doc.sourceUrl;
  }

  async syncDocument(documentId: number): Promise<ComplySaGovernmentDocument> {
    const doc = await this.repository.findOne({ where: { id: documentId } });

    if (doc === null) {
      throw new NotFoundException("Government document not found");
    }

    if (doc.synced && doc.filePath !== null) {
      return doc;
    }

    const response = await fetch(doc.sourceUrl, {
      headers: { "User-Agent": "Annix-ComplySA/1.0" },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download document from ${doc.sourceUrl}: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "application/pdf";

    const filename = this.filenameFromUrl(doc.sourceUrl);
    const multerFile = {
      buffer,
      originalname: filename,
      mimetype: contentType,
      size: buffer.length,
      fieldname: "file",
      encoding: "7bit",
      stream: null as never,
      destination: "",
      filename,
      path: "",
    } as Express.Multer.File;

    const subPath = `${StorageArea.COMPLY_SA}/government-documents/${doc.category}`;
    const result = await this.storageService.upload(multerFile, subPath);

    doc.filePath = result.path;
    doc.synced = true;
    doc.sizeBytes = result.size;
    doc.mimeType = result.mimeType;

    this.logger.log(`Government document synced to S3: ${doc.name} -> ${result.path}`);

    return this.repository.save(doc);
  }

  async syncAll(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    const unsyncedDocs = await this.repository.find({ where: { synced: false } });
    const errors: string[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const doc of unsyncedDocs) {
      try {
        await this.syncDocument(doc.id);
        syncedCount += 1;
      } catch (error) {
        failedCount += 1;
        const message = `${doc.name}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(message);
        this.logger.error(`Failed to sync government document: ${message}`);
      }
    }

    this.logger.log(
      `Government documents sync complete: ${syncedCount} synced, ${failedCount} failed`,
    );

    return { syncedCount, failedCount, errors };
  }

  private filenameFromUrl(url: string): string {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "document.pdf";
    return decodeURIComponent(lastSegment);
  }
}
