import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { AnnixSentinelAiService } from "../ai/ai.service";
import { AnnixSentinelComplianceService } from "../compliance/compliance.service";
import { AnnixSentinelDocument } from "./entities/document.entity";

const PRESIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class AnnixSentinelDocumentsService {
  private readonly logger = new Logger(AnnixSentinelDocumentsService.name);

  constructor(
    @InjectRepository(AnnixSentinelDocument)
    private readonly documentRepository: Repository<AnnixSentinelDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiService: AnnixSentinelAiService,
    private readonly complianceService: AnnixSentinelComplianceService,
  ) {}

  async upload(
    companyId: number,
    file: Express.Multer.File,
    requirementId: number | null = null,
    userId: number | null = null,
  ): Promise<AnnixSentinelDocument> {
    const subPath =
      requirementId !== null
        ? `${StorageArea.ANNIX_SENTINEL}/companies/${companyId}/requirements/${requirementId}`
        : `${StorageArea.ANNIX_SENTINEL}/companies/${companyId}/documents`;

    const result = await this.storageService.upload(file, subPath);

    this.logger.log(`Document uploaded: ${result.originalFilename} -> ${result.path}`);

    const document = this.documentRepository.create({
      companyId,
      requirementId,
      name: result.originalFilename,
      filePath: result.path,
      mimeType: result.mimeType,
      sizeBytes: result.size,
      uploadedByUserId: userId,
    });

    const saved = await this.documentRepository.save(document);

    if (requirementId !== null) {
      this.analyzeDocumentForChecklist(saved).catch((error) =>
        this.logger.error(
          `AI checklist analysis failed for document ${saved.id}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }

    return saved;
  }

  private async analyzeDocumentForChecklist(document: AnnixSentinelDocument): Promise<void> {
    const result = await this.aiService.analyzeDocumentForChecklist(
      document.filePath,
      document.mimeType,
      document.sizeBytes,
      document.requirementId!,
    );

    if (result.completedStepIndices.length > 0) {
      await this.complianceService.completeChecklistStepsFromAi(
        document.companyId,
        document.requirementId!,
        result.completedStepIndices,
        result.reasoning,
      );
      this.logger.log(
        `AI auto-completed steps [${result.completedStepIndices.join(", ")}] for requirement ${document.requirementId}: ${result.reasoning}`,
      );
    }

    if (result.vatSubmissionCycle) {
      await this.complianceService.updateVatSubmissionCycle(
        document.companyId,
        result.vatSubmissionCycle,
      );
    }
  }

  async documentsForCompany(companyId: number): Promise<AnnixSentinelDocument[]> {
    return this.documentRepository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
  }

  async documentsByRequirement(
    companyId: number,
    requirementId: number,
  ): Promise<AnnixSentinelDocument[]> {
    return this.documentRepository.find({
      where: { companyId, requirementId },
      order: { createdAt: "DESC" },
    });
  }

  async presignedUrl(companyId: number, documentId: number): Promise<string> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, companyId },
    });

    if (document === null) {
      throw new NotFoundException("Document not found");
    }

    return this.storageService.presignedUrl(document.filePath, PRESIGNED_URL_TTL_SECONDS);
  }

  async remove(companyId: number, documentId: number): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, companyId },
    });

    if (document === null) {
      throw new NotFoundException("Document not found");
    }

    try {
      await this.storageService.delete(document.filePath);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from storage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.documentRepository.remove(document);
  }
}
