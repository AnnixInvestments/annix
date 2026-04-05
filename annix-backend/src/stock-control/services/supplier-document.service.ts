import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO, now } from "../../lib/datetime";
import {
  type IStorageService,
  STORAGE_SERVICE,
  StorageArea,
} from "../../storage/storage.interface";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { SupplierDocument, type SupplierDocumentType } from "../entities/supplier-document.entity";

const VALID_DOC_TYPES: SupplierDocumentType[] = [
  "bee_certificate",
  "tax_clearance",
  "iso_certificate",
  "insurance",
  "msds",
  "bank_confirmation",
  "company_registration",
  "vat_registration",
  "other",
];

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface UploadSupplierDocumentDto {
  supplierId: number;
  docType: string;
  docNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface SupplierDocumentFilters {
  supplierId?: number;
  docType?: string;
  expiryStatus?: "expired" | "expiring_soon" | "valid" | "no_expiry";
}

export interface SupplierDocumentWithUrl extends SupplierDocument {
  downloadUrl?: string;
  expiryStatus: "expired" | "expiring_soon" | "valid" | "no_expiry";
  daysUntilExpiry: number | null;
}

const EXPIRING_SOON_DAYS = 30;

@Injectable()
export class SupplierDocumentService {
  private readonly logger = new Logger(SupplierDocumentService.name);

  constructor(
    @InjectRepository(SupplierDocument)
    private readonly docRepo: Repository<SupplierDocument>,
    @InjectRepository(StockControlSupplier)
    private readonly supplierRepo: Repository<StockControlSupplier>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async upload(
    companyId: number,
    dto: UploadSupplierDocumentDto,
    file: Express.Multer.File,
    user: UserContext,
  ): Promise<SupplierDocument> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId, companyId },
    });

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    if (!VALID_DOC_TYPES.includes(dto.docType as SupplierDocumentType)) {
      throw new BadRequestException(
        `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
      );
    }

    if (!file) {
      throw new BadRequestException("File is required");
    }

    const subPath = `${StorageArea.STOCK_CONTROL}/supplier-documents/${companyId}/${dto.supplierId}`;
    const storageResult = await this.storageService.upload(file, subPath);

    const doc = this.docRepo.create({
      companyId,
      supplierId: dto.supplierId,
      docType: dto.docType as SupplierDocumentType,
      docNumber: dto.docNumber?.trim() || null,
      issuedAt: dto.issuedAt || null,
      expiresAt: dto.expiresAt || null,
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      mimeType: storageResult.mimeType,
      notes: dto.notes?.trim() || null,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.docRepo.save(doc);
    this.logger.log(
      `Supplier document uploaded: type=${dto.docType} supplier=${supplier.name} by ${user.name}`,
    );

    return this.findById(companyId, saved.id);
  }

  async findAll(
    companyId: number,
    filters: SupplierDocumentFilters = {},
  ): Promise<SupplierDocumentWithUrl[]> {
    const qb = this.docRepo
      .createQueryBuilder("doc")
      .leftJoinAndSelect("doc.supplier", "supplier")
      .where("doc.companyId = :companyId", { companyId })
      .orderBy("doc.expiresAt", "ASC", "NULLS LAST")
      .addOrderBy("doc.createdAt", "DESC");

    if (filters.supplierId) {
      qb.andWhere("doc.supplierId = :supplierId", { supplierId: filters.supplierId });
    }

    if (filters.docType) {
      qb.andWhere("doc.docType = :docType", { docType: filters.docType });
    }

    const docs = await qb.getMany();
    const withStatus = docs.map((doc) => this.withExpiryStatus(doc));

    if (filters.expiryStatus) {
      return withStatus.filter((d) => d.expiryStatus === filters.expiryStatus);
    }

    return withStatus;
  }

  async findById(companyId: number, id: number): Promise<SupplierDocumentWithUrl> {
    const doc = await this.docRepo.findOne({
      where: { id, companyId },
      relations: ["supplier"],
    });

    if (!doc) {
      throw new NotFoundException("Supplier document not found");
    }

    return this.withExpiryStatus(doc);
  }

  async presignedUrl(companyId: number, id: number): Promise<string> {
    const doc = await this.findById(companyId, id);
    return this.storageService.presignedUrl(doc.filePath, 3600);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const doc = await this.findById(companyId, id);

    try {
      await this.storageService.delete(doc.filePath);
    } catch (err) {
      this.logger.warn(
        `Failed to delete storage file for supplier document ${id}: ${(err as Error).message}`,
      );
    }
    await this.docRepo.delete({ id, companyId });

    this.logger.log(`Supplier document deleted: id=${id} type=${doc.docType}`);
  }

  async update(
    companyId: number,
    id: number,
    updates: Partial<UploadSupplierDocumentDto>,
  ): Promise<SupplierDocumentWithUrl> {
    const existing = await this.findById(companyId, id);

    if (updates.docType && !VALID_DOC_TYPES.includes(updates.docType as SupplierDocumentType)) {
      throw new BadRequestException(
        `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
      );
    }

    const patch = {
      ...(updates.docType ? { docType: updates.docType as SupplierDocumentType } : {}),
      ...(updates.docNumber !== undefined ? { docNumber: updates.docNumber?.trim() || null } : {}),
      ...(updates.issuedAt !== undefined ? { issuedAt: updates.issuedAt || null } : {}),
      ...(updates.expiresAt !== undefined ? { expiresAt: updates.expiresAt || null } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes?.trim() || null } : {}),
    };

    await this.docRepo.update({ id: existing.id, companyId }, patch);

    return this.findById(companyId, id);
  }

  async expiringSoon(companyId: number, withinDays = EXPIRING_SOON_DAYS) {
    const docs = await this.findAll(companyId);
    return docs.filter((d) => {
      if (d.daysUntilExpiry === null) return false;
      return d.daysUntilExpiry <= withinDays;
    });
  }

  private withExpiryStatus(doc: SupplierDocument): SupplierDocumentWithUrl {
    if (!doc.expiresAt) {
      return {
        ...doc,
        expiryStatus: "no_expiry",
        daysUntilExpiry: null,
      };
    }

    const expires = fromISO(doc.expiresAt);
    const today = now().startOf("day");
    const days = Math.floor(expires.diff(today, "days").days);

    const status: SupplierDocumentWithUrl["expiryStatus"] =
      days < 0 ? "expired" : days <= EXPIRING_SOON_DAYS ? "expiring_soon" : "valid";

    return {
      ...doc,
      expiryStatus: status,
      daysUntilExpiry: days,
    };
  }
}
