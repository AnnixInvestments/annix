import { createHash, randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import {
  type ChemicalSupplierDocumentDto,
  type ChemicalSupplierDocumentFilters,
  type CreateChemicalSupplierDocumentDto,
  processingStatusLabel,
  type UpdateChemicalSupplierDocumentDto,
} from "./dto/chemical-supplier-document.dto";
import {
  type ChemicalDocExtractedData,
  ChemicalSupplierDocument,
} from "./entities/chemical-supplier-document.entity";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";
import { CocProcessingStatus } from "./entities/rubber-supplier-coc.entity";
import { AuRubberDocumentType, sanitizeAuRubberDocNumber } from "./lib/au-rubber-document-paths";

@Injectable()
export class ChemicalSupplierDocumentService {
  private readonly logger = new Logger(ChemicalSupplierDocumentService.name);

  constructor(
    @InjectRepository(ChemicalSupplierDocument)
    private readonly documentRepository: Repository<ChemicalSupplierDocument>,
    @InjectRepository(RubberCompany)
    private readonly companyRepository: Repository<RubberCompany>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async list(
    filters: ChemicalSupplierDocumentFilters = {},
  ): Promise<ChemicalSupplierDocumentDto[]> {
    const qb = this.documentRepository
      .createQueryBuilder("doc")
      .leftJoinAndSelect("doc.supplierCompany", "supplier")
      .orderBy("doc.createdAt", "DESC");

    if (filters.supplierCompanyId) {
      qb.andWhere("doc.supplierCompanyId = :supplierCompanyId", {
        supplierCompanyId: filters.supplierCompanyId,
      });
    }
    if (filters.processingStatus) {
      qb.andWhere("doc.processingStatus = :processingStatus", {
        processingStatus: filters.processingStatus,
      });
    }
    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        "(doc.deliveryNoteNumber ILIKE :term OR doc.batchNumber ILIKE :term OR doc.productName ILIKE :term)",
        { term },
      );
    }

    const docs = await qb.getMany();
    return docs.map((doc) => this.toDto(doc));
  }

  async byId(id: number): Promise<ChemicalSupplierDocumentDto> {
    const doc = await this.findEntity(id);
    return this.toDto(doc);
  }

  async documentUrl(id: number): Promise<string> {
    const doc = await this.findEntity(id);
    return this.storageService.presignedUrl(doc.documentPath);
  }

  async documentBuffer(id: number): Promise<Buffer> {
    const doc = await this.findEntity(id);
    return this.storageService.download(doc.documentPath);
  }

  async uploadDocument(
    file: Express.Multer.File,
    dto: CreateChemicalSupplierDocumentDto,
    createdBy?: string,
  ): Promise<ChemicalSupplierDocumentDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No document file provided");
    }

    const documentHash = createHash("sha256").update(file.buffer).digest("hex");
    const existing = await this.documentRepository.findOne({
      where: { documentHash },
      relations: ["supplierCompany"],
    });
    if (existing) {
      this.logger.log(
        `Chemical document with hash ${documentHash} already exists (id ${existing.id}) — skipping duplicate ingest`,
      );
      return this.toDto(existing);
    }

    const supplierCompanyId = await this.resolveSupplierCompanyId(dto);

    const subPath = `${StorageArea.AU_RUBBER}/suppliers/${AuRubberDocumentType.CHEMICAL_DOC}/${sanitizeAuRubberDocNumber(
      dto.deliveryNoteNumber,
    )}`;
    const upload = await this.storageService.upload(file, subPath);

    const doc = this.documentRepository.create({
      firebaseUid: `chem-doc-${randomUUID()}`,
      supplierCompanyId,
      deliveryNoteNumber: dto.deliveryNoteNumber ?? null,
      batchNumber: dto.batchNumber ?? null,
      productName: dto.productName ?? null,
      documentPath: upload.path,
      documentHash,
      processingStatus: CocProcessingStatus.PENDING,
      createdBy: createdBy ?? null,
    });

    const saved = await this.documentRepository.save(doc);
    const withSupplier = await this.findEntity(saved.id);
    return this.toDto(withSupplier);
  }

  async update(
    id: number,
    dto: UpdateChemicalSupplierDocumentDto,
  ): Promise<ChemicalSupplierDocumentDto> {
    const doc = await this.findEntity(id);

    if (dto.supplierCompanyId !== undefined) doc.supplierCompanyId = dto.supplierCompanyId;
    if (dto.deliveryNoteNumber !== undefined) doc.deliveryNoteNumber = dto.deliveryNoteNumber;
    if (dto.batchNumber !== undefined) doc.batchNumber = dto.batchNumber;
    if (dto.productName !== undefined) doc.productName = dto.productName;
    if (dto.extractedData !== undefined) doc.extractedData = dto.extractedData;
    if (dto.reviewNotes !== undefined) doc.reviewNotes = dto.reviewNotes;

    await this.documentRepository.save(doc);
    const refreshed = await this.findEntity(id);
    return this.toDto(refreshed);
  }

  async applyExtraction(
    id: number,
    extractedData: ChemicalDocExtractedData,
    status: CocProcessingStatus,
  ): Promise<ChemicalSupplierDocument> {
    const doc = await this.findEntity(id);
    doc.extractedData = extractedData;
    doc.processingStatus = status;
    if (!doc.batchNumber && extractedData.batchNumber) doc.batchNumber = extractedData.batchNumber;
    if (!doc.productName && extractedData.productName) doc.productName = extractedData.productName;
    if (!doc.deliveryNoteNumber && extractedData.deliveryNoteNumber) {
      doc.deliveryNoteNumber = extractedData.deliveryNoteNumber;
    }
    return this.documentRepository.save(doc);
  }

  async markFailed(id: number): Promise<void> {
    await this.documentRepository.update(id, { processingStatus: CocProcessingStatus.FAILED });
  }

  async approve(id: number, approvedBy?: string): Promise<ChemicalSupplierDocumentDto> {
    const doc = await this.findEntity(id);
    doc.processingStatus = CocProcessingStatus.APPROVED;
    doc.approvedBy = approvedBy ?? null;
    doc.approvedAt = now().toJSDate();
    await this.documentRepository.save(doc);
    const refreshed = await this.findEntity(id);
    return this.toDto(refreshed);
  }

  async remove(id: number): Promise<void> {
    const doc = await this.findEntity(id);
    await this.documentRepository.remove(doc);
  }

  private async findEntity(id: number): Promise<ChemicalSupplierDocument> {
    const doc = await this.documentRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    if (!doc) {
      throw new NotFoundException(`Chemical supplier document ${id} not found`);
    }
    return doc;
  }

  private async resolveSupplierCompanyId(dto: CreateChemicalSupplierDocumentDto): Promise<number> {
    if (dto.supplierCompanyId) {
      const company = await this.companyRepository.findOne({
        where: { id: dto.supplierCompanyId },
      });
      if (!company) {
        throw new BadRequestException(`Supplier company ${dto.supplierCompanyId} not found`);
      }
      return company.id;
    }

    if (dto.supplierName) {
      const company = await this.companyRepository.findOne({
        where: { name: ILike(dto.supplierName.trim()), companyType: CompanyType.SUPPLIER },
      });
      if (company) {
        return company.id;
      }
    }

    throw new BadRequestException("A supplier company id or matching supplier name is required");
  }

  private toDto(doc: ChemicalSupplierDocument): ChemicalSupplierDocumentDto {
    return {
      id: doc.id,
      firebaseUid: doc.firebaseUid,
      supplierCompanyId: doc.supplierCompanyId,
      supplierName: doc.supplierCompany?.name ?? null,
      deliveryNoteNumber: doc.deliveryNoteNumber,
      batchNumber: doc.batchNumber,
      productName: doc.productName,
      documentPath: doc.documentPath,
      processingStatus: doc.processingStatus,
      processingStatusLabel: processingStatusLabel(doc.processingStatus),
      extractedData: doc.extractedData,
      reviewNotes: doc.reviewNotes,
      approvedBy: doc.approvedBy,
      approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
