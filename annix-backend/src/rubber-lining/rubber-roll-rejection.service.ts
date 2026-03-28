import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateUniqueId, now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { RollRejectionStatus, RubberRollRejection } from "./entities/rubber-roll-rejection.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";
import { RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";

export interface RejectRollInput {
  originalSupplierCocId: number;
  rollNumber: string;
  rejectionReason: string;
  rejectedBy: string;
  notes?: string | null;
}

export interface RollRejectionDto {
  id: number;
  firebaseUid: string;
  originalSupplierCocId: number;
  originalCocNumber: string | null;
  rollNumber: string;
  rollStockId: number | null;
  rejectionReason: string;
  rejectedBy: string;
  rejectedAt: string;
  returnDocumentPath: string | null;
  replacementSupplierCocId: number | null;
  replacementCocNumber: string | null;
  replacementRollNumber: string | null;
  status: RollRejectionStatus;
  statusLabel: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<RollRejectionStatus, string> = {
  [RollRejectionStatus.PENDING_RETURN]: "Pending Return",
  [RollRejectionStatus.RETURNED]: "Returned",
  [RollRejectionStatus.REPLACEMENT_RECEIVED]: "Replacement Received",
  [RollRejectionStatus.CLOSED]: "Closed",
};

@Injectable()
export class RubberRollRejectionService {
  constructor(
    @InjectRepository(RubberRollRejection)
    private readonly rejectionRepo: Repository<RubberRollRejection>,
    @InjectRepository(RubberRollStock)
    private readonly rollStockRepo: Repository<RubberRollStock>,
    @InjectRepository(RubberSupplierCoc)
    private readonly supplierCocRepo: Repository<RubberSupplierCoc>,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  async rejectRoll(input: RejectRollInput): Promise<RollRejectionDto> {
    const coc = await this.supplierCocRepo.findOne({
      where: { id: input.originalSupplierCocId },
    });
    if (!coc) {
      throw new NotFoundException("Supplier CoC not found");
    }

    const rollStock = await this.rollStockRepo.findOne({
      where: { rollNumber: input.rollNumber.trim() },
    });

    const rejection = this.rejectionRepo.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      originalSupplierCocId: input.originalSupplierCocId,
      rollNumber: input.rollNumber.trim(),
      rollStockId: rollStock?.id || null,
      rejectionReason: input.rejectionReason,
      rejectedBy: input.rejectedBy,
      rejectedAt: now().toJSDate(),
      status: RollRejectionStatus.PENDING_RETURN,
      notes: input.notes || null,
    });

    const saved = await this.rejectionRepo.save(rejection);

    if (rollStock && rollStock.status === RollStockStatus.IN_STOCK) {
      rollStock.status = RollStockStatus.REJECTED;
      await this.rollStockRepo.save(rollStock);
    }

    return this.mapToDto(saved);
  }

  async uploadReturnDocument(
    rejectionId: number,
    file: Express.Multer.File,
  ): Promise<RollRejectionDto> {
    const rejection = await this.rejectionRepo.findOne({
      where: { id: rejectionId },
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
    });
    if (!rejection) {
      throw new NotFoundException("Roll rejection not found");
    }

    const uploadResult = await this.storageService.upload(
      file,
      `${StorageArea.AU_RUBBER}/roll-rejections/${rejectionId}`,
    );

    rejection.returnDocumentPath = uploadResult.path;
    rejection.status = RollRejectionStatus.RETURNED;
    const saved = await this.rejectionRepo.save(rejection);
    return this.mapToDto(saved);
  }

  async linkReplacementCoc(
    rejectionId: number,
    replacementCocId: number,
    replacementRollNumber?: string,
  ): Promise<RollRejectionDto> {
    const rejection = await this.rejectionRepo.findOne({
      where: { id: rejectionId },
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
    });
    if (!rejection) {
      throw new NotFoundException("Roll rejection not found");
    }

    const replacementCoc = await this.supplierCocRepo.findOne({
      where: { id: replacementCocId },
    });
    if (!replacementCoc) {
      throw new NotFoundException("Replacement supplier CoC not found");
    }

    rejection.replacementSupplierCocId = replacementCocId;
    rejection.replacementRollNumber = replacementRollNumber?.trim() || null;
    rejection.status = RollRejectionStatus.REPLACEMENT_RECEIVED;
    const saved = await this.rejectionRepo.save(rejection);
    return this.mapToDto(saved);
  }

  async closeRejection(rejectionId: number): Promise<RollRejectionDto> {
    const rejection = await this.rejectionRepo.findOne({
      where: { id: rejectionId },
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
    });
    if (!rejection) {
      throw new NotFoundException("Roll rejection not found");
    }

    rejection.status = RollRejectionStatus.CLOSED;
    const saved = await this.rejectionRepo.save(rejection);
    return this.mapToDto(saved);
  }

  async rejectionsBySupplierCoc(supplierCocId: number): Promise<RollRejectionDto[]> {
    const rejections = await this.rejectionRepo.find({
      where: { originalSupplierCocId: supplierCocId },
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
      order: { createdAt: "DESC" },
    });
    return rejections.map((r) => this.mapToDto(r));
  }

  async rejectedRollNumbersForCoc(supplierCocId: number): Promise<string[]> {
    const rejections = await this.rejectionRepo.find({
      where: { originalSupplierCocId: supplierCocId },
      select: ["rollNumber"],
    });
    return rejections.map((r) => r.rollNumber);
  }

  async rejectedRollNumbersMap(): Promise<
    Map<number, { rollNumber: string; replacementCocId: number | null }>
  > {
    const rejections = await this.rejectionRepo.find({
      select: ["originalSupplierCocId", "rollNumber", "replacementSupplierCocId"],
    });
    const map = new Map<number, { rollNumber: string; replacementCocId: number | null }>();
    rejections.forEach((r) => {
      map.set(r.originalSupplierCocId, {
        rollNumber: r.rollNumber,
        replacementCocId: r.replacementSupplierCocId,
      });
    });
    return map;
  }

  async allRejections(statusFilter?: RollRejectionStatus): Promise<RollRejectionDto[]> {
    const where: Record<string, unknown> = {};
    if (statusFilter) {
      where.status = statusFilter;
    }
    const rejections = await this.rejectionRepo.find({
      where,
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
      order: { createdAt: "DESC" },
    });
    return rejections.map((r) => this.mapToDto(r));
  }

  async returnDocumentPresignedUrl(rejectionId: number): Promise<string | null> {
    const rejection = await this.rejectionRepo.findOne({
      where: { id: rejectionId },
    });
    if (!rejection || !rejection.returnDocumentPath) return null;
    return this.storageService.presignedUrl(rejection.returnDocumentPath, 3600);
  }

  private mapToDto(rejection: RubberRollRejection): RollRejectionDto {
    return {
      id: rejection.id,
      firebaseUid: rejection.firebaseUid,
      originalSupplierCocId: rejection.originalSupplierCocId,
      originalCocNumber: rejection.originalSupplierCoc?.cocNumber || null,
      rollNumber: rejection.rollNumber,
      rollStockId: rejection.rollStockId,
      rejectionReason: rejection.rejectionReason,
      rejectedBy: rejection.rejectedBy,
      rejectedAt: rejection.rejectedAt.toISOString(),
      returnDocumentPath: rejection.returnDocumentPath,
      replacementSupplierCocId: rejection.replacementSupplierCocId,
      replacementCocNumber: rejection.replacementSupplierCoc?.cocNumber || null,
      replacementRollNumber: rejection.replacementRollNumber,
      status: rejection.status,
      statusLabel: STATUS_LABELS[rejection.status],
      notes: rejection.notes,
      createdAt: rejection.createdAt.toISOString(),
    };
  }
}
