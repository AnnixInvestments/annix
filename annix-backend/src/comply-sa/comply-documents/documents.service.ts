import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  IStorageService,
  STORAGE_SERVICE,
  StorageArea,
} from "../../storage/storage.interface";
import { ComplySaDocument } from "./entities/document.entity";

@Injectable()
export class ComplySaDocumentsService {
  private readonly logger = new Logger(ComplySaDocumentsService.name);

  constructor(
    @InjectRepository(ComplySaDocument)
    private readonly documentRepository: Repository<ComplySaDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async upload(
    companyId: number,
    file: Express.Multer.File,
    requirementId: number | null = null,
    userId: number | null = null,
  ): Promise<ComplySaDocument> {
    const subPath = requirementId !== null
      ? `${StorageArea.COMPLY_SA}/companies/${companyId}/requirements/${requirementId}`
      : `${StorageArea.COMPLY_SA}/companies/${companyId}/documents`;

    const result = await this.storageService.upload(file, subPath);

    this.logger.log(
      `Document uploaded: ${result.originalFilename} -> ${result.path}`,
    );

    const document = this.documentRepository.create({
      companyId,
      requirementId,
      name: result.originalFilename,
      filePath: result.path,
      mimeType: result.mimeType,
      sizeBytes: result.size,
      uploadedByUserId: userId,
    });

    return this.documentRepository.save(document);
  }

  async documentsForCompany(companyId: number): Promise<ComplySaDocument[]> {
    return this.documentRepository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
  }

  async documentsByRequirement(
    companyId: number,
    requirementId: number,
  ): Promise<ComplySaDocument[]> {
    return this.documentRepository.find({
      where: { companyId, requirementId },
      order: { createdAt: "DESC" },
    });
  }

  async presignedUrl(
    companyId: number,
    documentId: number,
  ): Promise<string> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, companyId },
    });

    if (document === null) {
      throw new NotFoundException("Document not found");
    }

    return this.storageService.getPresignedUrl(document.filePath, 3600);
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
