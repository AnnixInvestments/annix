import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaDocument } from "./entities/document.entity";

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  path?: string;
}

@Injectable()
export class ComplySaDocumentsService {
  constructor(
    @InjectRepository(ComplySaDocument)
    private readonly documentRepository: Repository<ComplySaDocument>,
  ) {}

  async upload(
    companyId: number,
    file: UploadedFile,
    requirementId: number | null = null,
    userId: number | null = null,
  ): Promise<ComplySaDocument> {
    const document = this.documentRepository.create({
      companyId,
      requirementId,
      name: file.originalname,
      filePath: file.path ?? `uploads/${file.originalname}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
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

  async remove(companyId: number, documentId: number): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, companyId },
    });

    if (document === null) {
      throw new NotFoundException("Document not found");
    }

    await this.documentRepository.remove(document);
  }
}
