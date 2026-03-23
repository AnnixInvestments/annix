import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import {
  ReconciliationDocCategory,
  ReconciliationDocument,
} from "../entities/reconciliation-document.entity";
import { BackgroundStepService } from "./background-step.service";
import { ReconciliationExtractionService } from "./reconciliation-extraction.service";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

const REQUIRED_CATEGORIES = new Set([
  ReconciliationDocCategory.JT_DN,
  ReconciliationDocCategory.SALES_ORDER,
]);

const UPLOAD_SOURCE_DOCUMENTS_KEY = "upload_source_documents";

@Injectable()
export class ReconciliationDocumentService {
  private readonly logger = new Logger(ReconciliationDocumentService.name);

  constructor(
    @InjectRepository(ReconciliationDocument)
    private readonly docRepo: Repository<ReconciliationDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly backgroundStepService: BackgroundStepService,
    private readonly extractionService: ReconciliationExtractionService,
  ) {}

  async documentsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationDocument[]> {
    return this.docRepo.find({
      where: { companyId, jobCardId },
      order: { documentCategory: "ASC", createdAt: "DESC" },
    });
  }

  async upload(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    category: ReconciliationDocCategory,
    user: UserContext,
  ): Promise<ReconciliationDocument> {
    const subPath = `stock-control/job-cards/${companyId}/${jobCardId}/reconciliation`;
    const result = await this.storageService.upload(file, subPath);

    const doc = this.docRepo.create({
      companyId,
      jobCardId,
      documentCategory: category,
      filePath: result.path,
      originalFilename: result.originalFilename,
      mimeType: result.mimeType,
      fileSizeBytes: result.size,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.docRepo.save(doc);

    this.extractionService.extractItems(saved.id).catch((err) => {
      this.logger.error(`Async extraction failed for doc ${saved.id}: ${err.message}`);
    });

    await this.autoCompleteGateIfSatisfied(companyId, jobCardId, user);

    return saved;
  }

  async deleteDocument(companyId: number, id: number): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id, companyId } });
    if (!doc) {
      throw new NotFoundException(`Document #${id} not found`);
    }

    await this.storageService.delete(doc.filePath).catch(() => {});
    await this.docRepo.remove(doc);
  }

  async presignedUrl(companyId: number, id: number): Promise<string> {
    const doc = await this.docRepo.findOne({ where: { id, companyId } });
    if (!doc) {
      throw new NotFoundException(`Document #${id} not found`);
    }
    return this.storageService.presignedUrl(doc.filePath, 3600);
  }

  async downloadBuffer(
    companyId: number,
    id: number,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const doc = await this.docRepo.findOne({ where: { id, companyId } });
    if (!doc) {
      throw new NotFoundException(`Document #${id} not found`);
    }
    const buffer = await this.storageService.download(doc.filePath);
    return {
      buffer,
      filename: doc.originalFilename,
      mimeType: doc.mimeType || "application/octet-stream",
    };
  }

  async gateStatus(
    companyId: number,
    jobCardId: number,
  ): Promise<{
    satisfied: boolean;
    documents: Array<{
      category: ReconciliationDocCategory;
      required: boolean;
      uploaded: boolean;
      documentId: number | null;
      filename: string | null;
      extractionStatus: string | null;
    }>;
  }> {
    const docs = await this.docRepo.find({
      where: { companyId, jobCardId },
    });

    const uploadedCategories = new Map(docs.map((d) => [d.documentCategory, d]));

    const allCategories: ReconciliationDocCategory[] = [
      ReconciliationDocCategory.JT_DN,
      ReconciliationDocCategory.SALES_ORDER,
      ReconciliationDocCategory.CPO,
      ReconciliationDocCategory.DRAWING,
    ];

    const documents = allCategories.map((category) => {
      const doc = uploadedCategories.get(category) || null;
      return {
        category,
        required: REQUIRED_CATEGORIES.has(category),
        uploaded: doc !== null,
        documentId: doc?.id || null,
        filename: doc?.originalFilename || null,
        extractionStatus: doc?.extractionStatus || null,
      };
    });

    const satisfied = Array.from(REQUIRED_CATEGORIES).every((cat) => uploadedCategories.has(cat));

    return { satisfied, documents };
  }

  private async autoCompleteGateIfSatisfied(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<void> {
    const { satisfied } = await this.gateStatus(companyId, jobCardId);
    if (!satisfied) return;

    try {
      await this.backgroundStepService.completeStep(
        companyId,
        jobCardId,
        UPLOAD_SOURCE_DOCUMENTS_KEY,
        user,
        "Auto-completed: all required documents uploaded",
      );
      this.logger.log(`Document gate auto-completed for job card ${jobCardId}`);
    } catch {
      this.logger.debug(
        `Document gate step already completed or not available for job card ${jobCardId}`,
      );
    }
  }
}
