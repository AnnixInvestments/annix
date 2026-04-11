import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  type IStorageService,
  STORAGE_SERVICE,
  StorageArea,
} from "../../storage/storage.interface";
import {
  ProductDatasheet,
  type ProductDatasheetDocType,
  type ProductDatasheetType,
} from "../entities/product-datasheet.entity";
import { DatasheetExtractionService } from "./datasheet-extraction.service";
import { RubberCompoundService } from "./rubber-compound.service";

export interface UploadDatasheetInput {
  productType: ProductDatasheetType;
  paintProductId?: number | null;
  rubberCompoundId?: number | null;
  solutionProductId?: number | null;
  consumableProductId?: number | null;
  docType?: ProductDatasheetDocType;
  file: Express.Multer.File;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  notes?: string | null;
}

@Injectable()
export class ProductDatasheetService {
  private readonly logger = new Logger(ProductDatasheetService.name);

  constructor(
    @InjectRepository(ProductDatasheet)
    private readonly datasheetRepo: Repository<ProductDatasheet>,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
    private readonly extractionService: DatasheetExtractionService,
    private readonly compoundService: RubberCompoundService,
  ) {}

  async upload(companyId: number, input: UploadDatasheetInput): Promise<ProductDatasheet> {
    this.assertExactlyOneOwner(input);
    const ownerId = this.ownerId(input);
    const subPath = `${StorageArea.STOCK_MANAGEMENT}/datasheets/${input.productType}/${ownerId}`;
    const storageResult = await this.storage.upload(input.file, subPath);

    const previousActive = await this.datasheetRepo.find({
      where: this.ownerWhere(companyId, input),
    });
    const nextRevision =
      previousActive.length === 0
        ? 1
        : Math.max(...previousActive.map((row) => row.revisionNumber)) + 1;

    if (previousActive.length > 0) {
      const previousIds = previousActive.map((row) => row.id);
      await this.datasheetRepo.update(previousIds, { isActive: false });
    }

    const datasheet = this.datasheetRepo.create({
      companyId,
      productType: input.productType,
      paintProductId: input.paintProductId ?? null,
      rubberCompoundId: input.rubberCompoundId ?? null,
      solutionProductId: input.solutionProductId ?? null,
      consumableProductId: input.consumableProductId ?? null,
      docType: input.docType ?? "tds",
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      mimeType: storageResult.mimeType,
      revisionNumber: nextRevision,
      extractionStatus: "pending",
      uploadedById: input.uploadedById ?? null,
      uploadedByName: input.uploadedByName ?? null,
      notes: input.notes ?? null,
      isActive: true,
    });
    const saved = await this.datasheetRepo.save(datasheet);

    if (input.productType === "rubber_compound" && input.rubberCompoundId) {
      await this.compoundService.setDatasheetStatus(input.rubberCompoundId, "uploaded", saved.id);
    }

    void this.runExtraction(saved.id, input.file.buffer, input.file.mimetype).catch((err) => {
      this.logger.error(
        `Async extraction failed for datasheet ${saved.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });

    return saved;
  }

  async list(companyId: number, productType?: ProductDatasheetType): Promise<ProductDatasheet[]> {
    const where: { companyId: number; productType?: ProductDatasheetType; isActive: boolean } = {
      companyId,
      isActive: true,
    };
    if (productType) {
      where.productType = productType;
    }
    return this.datasheetRepo.find({
      where,
      order: { uploadedAt: "DESC" },
    });
  }

  async byId(companyId: number, id: number): Promise<ProductDatasheet> {
    const datasheet = await this.datasheetRepo.findOne({ where: { id, companyId } });
    if (!datasheet) {
      throw new NotFoundException(`Datasheet ${id} not found`);
    }
    return datasheet;
  }

  async presignedUrl(companyId: number, id: number, expiresInSeconds = 3600): Promise<string> {
    const datasheet = await this.byId(companyId, id);
    return this.storage.presignedUrl(datasheet.filePath, expiresInSeconds);
  }

  async verify(companyId: number, id: number): Promise<ProductDatasheet> {
    const datasheet = await this.byId(companyId, id);
    datasheet.extractionStatus = "completed";
    const saved = await this.datasheetRepo.save(datasheet);
    if (datasheet.productType === "rubber_compound" && datasheet.rubberCompoundId) {
      await this.compoundService.setDatasheetStatus(
        datasheet.rubberCompoundId,
        "verified",
        saved.id,
      );
    }
    return saved;
  }

  private async runExtraction(
    datasheetId: number,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    await this.datasheetRepo.update(datasheetId, {
      extractionStatus: "in_progress",
      extractionStartedAt: now().toJSDate(),
    });
    try {
      const result = await this.extractionService.extractFromBuffer(fileBuffer, mimeType);
      const datasheet = await this.datasheetRepo.findOneOrFail({ where: { id: datasheetId } });
      datasheet.extractionStatus = "completed";
      datasheet.extractionCompletedAt = now().toJSDate();
      datasheet.extractedData = result.data;
      datasheet.extractionModel = result.model;
      datasheet.extractionNotes = result.notes ?? null;
      await this.datasheetRepo.save(datasheet);
      if (datasheet.productType === "rubber_compound" && datasheet.rubberCompoundId) {
        await this.compoundService.setDatasheetStatus(
          datasheet.rubberCompoundId,
          "extracted",
          datasheetId,
        );
      }
    } catch (err) {
      await this.datasheetRepo.update(datasheetId, {
        extractionStatus: "failed",
        extractionCompletedAt: now().toJSDate(),
        extractionNotes: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private assertExactlyOneOwner(input: UploadDatasheetInput): void {
    const owners = [
      input.paintProductId,
      input.rubberCompoundId,
      input.solutionProductId,
      input.consumableProductId,
    ].filter((id) => id !== null && id !== undefined);
    if (owners.length !== 1) {
      throw new BadRequestException(
        "Exactly one of paintProductId, rubberCompoundId, solutionProductId, consumableProductId must be set",
      );
    }
  }

  private ownerId(input: UploadDatasheetInput): number {
    const id =
      input.paintProductId ??
      input.rubberCompoundId ??
      input.solutionProductId ??
      input.consumableProductId;
    if (id === null || id === undefined) {
      throw new BadRequestException("No owner id present");
    }
    return id;
  }

  private ownerWhere(
    companyId: number,
    input: UploadDatasheetInput,
  ): {
    companyId: number;
    isActive: boolean;
    paintProductId?: number;
    rubberCompoundId?: number;
    solutionProductId?: number;
    consumableProductId?: number;
  } {
    if (input.paintProductId) {
      return { companyId, isActive: true, paintProductId: input.paintProductId };
    }
    if (input.rubberCompoundId) {
      return { companyId, isActive: true, rubberCompoundId: input.rubberCompoundId };
    }
    if (input.solutionProductId) {
      return { companyId, isActive: true, solutionProductId: input.solutionProductId };
    }
    if (input.consumableProductId) {
      return { companyId, isActive: true, consumableProductId: input.consumableProductId };
    }
    throw new BadRequestException("No owner id present");
  }
}
