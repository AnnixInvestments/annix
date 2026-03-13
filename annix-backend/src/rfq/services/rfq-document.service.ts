import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { User } from "../../user/entities/user.entity";
import { RfqDocumentResponseDto } from "../dto/rfq-document.dto";
import { Rfq } from "../entities/rfq.entity";
import { RfqDocument } from "../entities/rfq-document.entity";

const MAX_DOCUMENTS_PER_RFQ = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class RfqDocumentService {
  private readonly logger = new Logger(RfqDocumentService.name);

  constructor(
    @InjectRepository(Rfq)
    private rfqRepository: Repository<Rfq>,
    @InjectRepository(RfqDocument)
    private rfqDocumentRepository: Repository<RfqDocument>,
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
  ) {}

  async uploadDocument(
    rfqId: number,
    file: Express.Multer.File,
    user?: User,
  ): Promise<RfqDocumentResponseDto> {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException("File size exceeds maximum allowed size of 50MB");
    }

    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["documents"],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    const currentDocCount = rfq.documents?.length || 0;
    if (currentDocCount >= MAX_DOCUMENTS_PER_RFQ) {
      throw new BadRequestException(
        `Maximum number of documents (${MAX_DOCUMENTS_PER_RFQ}) reached for this RFQ`,
      );
    }

    const subPath = `annix-app/rfq-documents/${rfqId}`;
    const storageResult = await this.storageService.upload(file, subPath);

    const document = this.rfqDocumentRepository.create({
      rfq,
      filename: file.originalname,
      filePath: storageResult.path,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedBy: user,
    });

    const savedDocument = await this.rfqDocumentRepository.save(document);

    return this.mapDocumentToResponse(savedDocument);
  }

  async documents(rfqId: number): Promise<RfqDocumentResponseDto[]> {
    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    const documents = await this.rfqDocumentRepository.find({
      where: { rfq: { id: rfqId } },
      relations: ["uploadedBy"],
      order: { createdAt: "DESC" },
    });

    return documents.map((doc) => this.mapDocumentToResponse(doc));
  }

  async documentById(documentId: number): Promise<RfqDocument> {
    const document = await this.rfqDocumentRepository.findOne({
      where: { id: documentId },
      relations: ["rfq", "uploadedBy"],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return document;
  }

  async downloadDocument(documentId: number): Promise<{ buffer: Buffer; document: RfqDocument }> {
    const document = await this.documentById(documentId);
    const buffer = await this.storageService.download(document.filePath);

    return { buffer, document };
  }

  async deleteDocument(documentId: number, user?: User): Promise<void> {
    const document = await this.documentById(documentId);

    await this.storageService.delete(document.filePath);

    await this.rfqDocumentRepository.remove(document);
  }

  private mapDocumentToResponse(document: RfqDocument): RfqDocumentResponseDto {
    return {
      id: document.id,
      rfqId: document.rfq?.id,
      filename: document.filename,
      mimeType: document.mimeType,
      fileSizeBytes: Number(document.fileSizeBytes),
      downloadUrl: `/api/rfq/documents/${document.id}/download`,
      uploadedBy: document.uploadedBy?.username,
      createdAt: document.createdAt,
    };
  }
}
