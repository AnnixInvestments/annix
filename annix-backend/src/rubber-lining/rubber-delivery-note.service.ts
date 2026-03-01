import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateUniqueId } from "../lib/datetime";
import {
  CreateDeliveryNoteDto,
  CreateDeliveryNoteItemDto,
  DeliveryNoteItemDto,
  RubberDeliveryNoteDto,
  UpdateDeliveryNoteDto,
} from "./dto/rubber-coc.dto";
import { RubberCompany } from "./entities/rubber-company.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExtractedDeliveryNoteData,
  RubberDeliveryNote,
} from "./entities/rubber-delivery-note.entity";
import { RubberDeliveryNoteItem } from "./entities/rubber-delivery-note-item.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";

const DELIVERY_NOTE_TYPE_LABELS: Record<DeliveryNoteType, string> = {
  [DeliveryNoteType.COMPOUND]: "Compound",
  [DeliveryNoteType.ROLL]: "Roll",
};

const DELIVERY_NOTE_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  [DeliveryNoteStatus.PENDING]: "Pending",
  [DeliveryNoteStatus.LINKED]: "Linked",
  [DeliveryNoteStatus.STOCK_CREATED]: "Stock Created",
};

@Injectable()
export class RubberDeliveryNoteService {
  constructor(
    @InjectRepository(RubberDeliveryNote)
    private deliveryNoteRepository: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberDeliveryNoteItem)
    private deliveryNoteItemRepository: Repository<RubberDeliveryNoteItem>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberProduct)
    private productRepository: Repository<RubberProduct>,
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
  ) {}

  async allDeliveryNotes(filters?: {
    deliveryNoteType?: DeliveryNoteType;
    status?: DeliveryNoteStatus;
    supplierCompanyId?: number;
  }): Promise<RubberDeliveryNoteDto[]> {
    const query = this.deliveryNoteRepository
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.supplierCompany", "company")
      .leftJoinAndSelect("dn.linkedCoc", "coc")
      .orderBy("dn.created_at", "DESC");

    if (filters?.deliveryNoteType) {
      query.andWhere("dn.delivery_note_type = :type", { type: filters.deliveryNoteType });
    }
    if (filters?.status) {
      query.andWhere("dn.status = :status", { status: filters.status });
    }
    if (filters?.supplierCompanyId) {
      query.andWhere("dn.supplier_company_id = :companyId", {
        companyId: filters.supplierCompanyId,
      });
    }

    const notes = await query.getMany();
    return notes.map((dn) => this.mapDeliveryNoteToDto(dn));
  }

  async deliveryNoteById(id: number): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    return note ? this.mapDeliveryNoteToDto(note) : null;
  }

  async createDeliveryNote(
    dto: CreateDeliveryNoteDto,
    createdBy?: string,
  ): Promise<RubberDeliveryNoteDto> {
    const company = await this.companyRepository.findOne({
      where: { id: dto.supplierCompanyId },
    });
    if (!company) {
      throw new BadRequestException("Supplier company not found");
    }

    const note = this.deliveryNoteRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      deliveryNoteType: dto.deliveryNoteType,
      deliveryNoteNumber: dto.deliveryNoteNumber,
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
      supplierCompanyId: dto.supplierCompanyId,
      documentPath: dto.documentPath ?? null,
      status: DeliveryNoteStatus.PENDING,
      createdBy: createdBy ?? null,
    });

    const saved = await this.deliveryNoteRepository.save(note);
    const result = await this.deliveryNoteRepository.findOne({
      where: { id: saved.id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    return this.mapDeliveryNoteToDto(result!);
  }

  async updateDeliveryNote(
    id: number,
    dto: UpdateDeliveryNoteDto,
  ): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    if (dto.deliveryNoteNumber !== undefined) note.deliveryNoteNumber = dto.deliveryNoteNumber;
    if (dto.deliveryDate !== undefined) {
      note.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    }
    if (dto.status !== undefined) note.status = dto.status;
    if (dto.linkedCocId !== undefined) note.linkedCocId = dto.linkedCocId;

    await this.deliveryNoteRepository.save(note);

    const result = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    return this.mapDeliveryNoteToDto(result!);
  }

  async setExtractedData(
    id: number,
    extractedData: ExtractedDeliveryNoteData,
  ): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    note.extractedData = extractedData;
    if (extractedData.deliveryNoteNumber) {
      note.deliveryNoteNumber = extractedData.deliveryNoteNumber;
    }
    if (extractedData.deliveryDate) {
      note.deliveryDate = new Date(extractedData.deliveryDate);
    }

    await this.deliveryNoteRepository.save(note);
    return this.mapDeliveryNoteToDto(note);
  }

  async linkToCoc(deliveryNoteId: number, cocId: number): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id: deliveryNoteId },
      relations: ["supplierCompany"],
    });
    if (!note) return null;

    const coc = await this.supplierCocRepository.findOne({
      where: { id: cocId },
    });
    if (!coc) {
      throw new BadRequestException("Supplier CoC not found");
    }

    note.linkedCocId = cocId;
    note.status = DeliveryNoteStatus.LINKED;
    await this.deliveryNoteRepository.save(note);

    await this.updateSupplierAvailableProducts(note.supplierCompanyId, coc.compoundCode);

    const result = await this.deliveryNoteRepository.findOne({
      where: { id: deliveryNoteId },
      relations: ["supplierCompany", "linkedCoc"],
    });
    return this.mapDeliveryNoteToDto(result!);
  }

  private async updateSupplierAvailableProducts(
    supplierCompanyId: number,
    compoundCode: string | null,
  ): Promise<void> {
    if (!compoundCode) return;

    const supplier = await this.companyRepository.findOne({
      where: { id: supplierCompanyId },
    });
    if (!supplier) return;

    const compoundCoding = await this.productCodingRepository.findOne({
      where: {
        codingType: ProductCodingType.COMPOUND,
        code: compoundCode,
      },
    });
    if (!compoundCoding) return;

    const matchingProducts = await this.productRepository.find({
      where: { compoundFirebaseUid: compoundCoding.firebaseUid },
    });

    if (matchingProducts.length === 0) return;

    const existingProducts = new Set(supplier.availableProducts);
    const newProductUids = matchingProducts
      .map((p) => p.firebaseUid)
      .filter((uid) => !existingProducts.has(uid));

    if (newProductUids.length > 0) {
      supplier.availableProducts = [...supplier.availableProducts, ...newProductUids];
      await this.companyRepository.save(supplier);
    }
  }

  async finalizeDeliveryNote(id: number): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    note.status = DeliveryNoteStatus.STOCK_CREATED;
    await this.deliveryNoteRepository.save(note);
    return this.mapDeliveryNoteToDto(note);
  }

  async deleteDeliveryNote(id: number): Promise<boolean> {
    const result = await this.deliveryNoteRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async itemsByDeliveryNoteId(deliveryNoteId: number): Promise<DeliveryNoteItemDto[]> {
    const items = await this.deliveryNoteItemRepository.find({
      where: { deliveryNoteId },
      order: { id: "ASC" },
    });
    return items.map((item) => this.mapDeliveryNoteItemToDto(item));
  }

  async createDeliveryNoteItem(dto: CreateDeliveryNoteItemDto): Promise<DeliveryNoteItemDto> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id: dto.deliveryNoteId },
    });
    if (!note) {
      throw new BadRequestException("Delivery note not found");
    }

    const item = this.deliveryNoteItemRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      deliveryNoteId: dto.deliveryNoteId,
      batchNumberStart: dto.batchNumberStart ?? null,
      batchNumberEnd: dto.batchNumberEnd ?? null,
      weightKg: dto.weightKg ?? null,
      rollNumber: dto.rollNumber ?? null,
      rollWeightKg: dto.rollWeightKg ?? null,
      widthMm: dto.widthMm ?? null,
      thicknessMm: dto.thicknessMm ?? null,
      lengthM: dto.lengthM ?? null,
      linkedBatchIds: [],
    });

    const saved = await this.deliveryNoteItemRepository.save(item);
    return this.mapDeliveryNoteItemToDto(saved);
  }

  async createItemsFromExtractedData(deliveryNoteId: number): Promise<DeliveryNoteItemDto[]> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id: deliveryNoteId },
    });
    if (!note) {
      throw new BadRequestException("Delivery note not found");
    }

    const extractedData = note.extractedData;
    if (!extractedData) {
      return [];
    }

    const createdItems: RubberDeliveryNoteItem[] = [];

    if (note.deliveryNoteType === DeliveryNoteType.COMPOUND && extractedData.batchRange) {
      const item = this.deliveryNoteItemRepository.create({
        firebaseUid: `pg_${generateUniqueId()}`,
        deliveryNoteId,
        batchNumberStart: extractedData.batchRange.split("-")[0]?.trim() ?? null,
        batchNumberEnd: extractedData.batchRange.split("-")[1]?.trim() ?? null,
        weightKg: extractedData.totalWeightKg ?? null,
        linkedBatchIds: [],
      });
      createdItems.push(item);
    }

    if (note.deliveryNoteType === DeliveryNoteType.ROLL && extractedData.rolls) {
      const rollItems = extractedData.rolls.map((roll) =>
        this.deliveryNoteItemRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          deliveryNoteId,
          rollNumber: roll.rollNumber,
          rollWeightKg: roll.weightKg ?? null,
          widthMm: roll.widthMm ?? null,
          thicknessMm: roll.thicknessMm ?? null,
          lengthM: roll.lengthM ?? null,
          linkedBatchIds: [],
        }),
      );
      createdItems.push(...rollItems);
    }

    if (createdItems.length > 0) {
      const saved = await this.deliveryNoteItemRepository.save(createdItems);
      return saved.map((item) => this.mapDeliveryNoteItemToDto(item));
    }

    return [];
  }

  async linkItemToBatches(itemId: number, batchIds: number[]): Promise<DeliveryNoteItemDto | null> {
    const item = await this.deliveryNoteItemRepository.findOne({
      where: { id: itemId },
    });
    if (!item) return null;

    item.linkedBatchIds = batchIds;
    await this.deliveryNoteItemRepository.save(item);
    return this.mapDeliveryNoteItemToDto(item);
  }

  async deleteDeliveryNoteItem(id: number): Promise<boolean> {
    const result = await this.deliveryNoteItemRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  private mapDeliveryNoteToDto(note: RubberDeliveryNote): RubberDeliveryNoteDto {
    return {
      id: note.id,
      firebaseUid: note.firebaseUid,
      deliveryNoteType: note.deliveryNoteType,
      deliveryNoteTypeLabel: DELIVERY_NOTE_TYPE_LABELS[note.deliveryNoteType],
      deliveryNoteNumber: note.deliveryNoteNumber,
      deliveryDate: note.deliveryDate?.toISOString().split("T")[0] ?? null,
      supplierCompanyId: note.supplierCompanyId,
      supplierCompanyName: note.supplierCompany?.name ?? null,
      documentPath: note.documentPath,
      status: note.status,
      statusLabel: DELIVERY_NOTE_STATUS_LABELS[note.status],
      linkedCocId: note.linkedCocId,
      linkedCocNumber: note.linkedCoc?.cocNumber ?? null,
      extractedData: note.extractedData,
      createdBy: note.createdBy,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private mapDeliveryNoteItemToDto(item: RubberDeliveryNoteItem): DeliveryNoteItemDto {
    return {
      id: item.id,
      firebaseUid: item.firebaseUid,
      deliveryNoteId: item.deliveryNoteId,
      batchNumberStart: item.batchNumberStart,
      batchNumberEnd: item.batchNumberEnd,
      weightKg: item.weightKg ? Number(item.weightKg) : null,
      rollNumber: item.rollNumber,
      rollWeightKg: item.rollWeightKg ? Number(item.rollWeightKg) : null,
      widthMm: item.widthMm ? Number(item.widthMm) : null,
      thicknessMm: item.thicknessMm ? Number(item.thicknessMm) : null,
      lengthM: item.lengthM ? Number(item.lengthM) : null,
      linkedBatchIds: item.linkedBatchIds,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
