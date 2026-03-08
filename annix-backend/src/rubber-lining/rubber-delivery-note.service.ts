import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { formatISODate, generateUniqueId } from "../lib/datetime";
import {
  CreateDeliveryNoteDto,
  CreateDeliveryNoteItemDto,
  DeliveryNoteItemDto,
  RubberDeliveryNoteDto,
  UpdateDeliveryNoteDto,
} from "./dto/rubber-coc.dto";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";
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
  private readonly logger = new Logger(RubberDeliveryNoteService.name);

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
      customerReference: dto.customerReference ?? null,
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
    if (extractedData.deliveryNoteNumber && !note.deliveryNoteNumber) {
      note.deliveryNoteNumber = extractedData.deliveryNoteNumber;
    }
    if (extractedData.deliveryDate && !note.deliveryDate) {
      note.deliveryDate = new Date(extractedData.deliveryDate);
    }
    if (extractedData.customerReference && !note.customerReference) {
      note.customerReference = extractedData.customerReference;
    }

    await this.deliveryNoteRepository.save(note);
    return this.mapDeliveryNoteToDto(note);
  }

  async saveUserCorrections(
    id: number,
    correctedData: ExtractedDeliveryNoteData,
  ): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    const enrichedData: ExtractedDeliveryNoteData = {
      ...correctedData,
      userCorrected: true,
      rolls: correctedData.rolls?.map((roll) => ({
        ...roll,
        areaSqM: roll.widthMm && roll.lengthM ? (roll.widthMm * roll.lengthM) / 1000 : undefined,
      })),
    };

    note.extractedData = enrichedData;
    if (enrichedData.deliveryNoteNumber) {
      note.deliveryNoteNumber = enrichedData.deliveryNoteNumber;
    }
    if (enrichedData.deliveryDate) {
      note.deliveryDate = new Date(enrichedData.deliveryDate);
    }
    if (enrichedData.customerReference !== undefined) {
      note.customerReference = enrichedData.customerReference || null;
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

  async findByDnNumberAndCompany(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    return this.deliveryNoteRepository.findOne({
      where: { deliveryNoteNumber, supplierCompanyId },
      relations: ["supplierCompany", "linkedCoc"],
    });
  }

  async replaceDeliveryNoteItems(deliveryNoteId: number): Promise<void> {
    await this.deliveryNoteItemRepository.delete({ deliveryNoteId });
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
      compoundType: dto.compoundType ?? null,
      quantity: dto.quantity ?? null,
      cocBatchNumbers: dto.cocBatchNumbers ?? null,
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

  async updateDocumentPath(
    id: number,
    documentPath: string,
  ): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    note.documentPath = documentPath;
    await this.deliveryNoteRepository.save(note);
    return this.mapDeliveryNoteToDto(note);
  }

  async findOrCreateCompanyByName(
    name: string,
    companyType: "supplier" | "customer",
  ): Promise<{ id: number; name: string }> {
    const normalizedName = name.trim().toUpperCase();
    const typeEnum = companyType === "supplier" ? CompanyType.SUPPLIER : CompanyType.CUSTOMER;

    const existing = await this.companyRepository
      .createQueryBuilder("c")
      .where("UPPER(c.name) = :name", { name: normalizedName })
      .andWhere("c.company_type = :type", { type: typeEnum })
      .getOne();

    if (existing) {
      return { id: existing.id, name: existing.name };
    }

    const newCompany = new RubberCompany();
    newCompany.firebaseUid = `pg_${generateUniqueId()}`;
    newCompany.name = name.trim();
    newCompany.companyType = typeEnum;
    newCompany.availableProducts = [];

    const saved: RubberCompany = await this.companyRepository.save(newCompany);
    return { id: saved.id, name: saved.name };
  }

  async acceptExtractAndSplit(id: number): Promise<{ deliveryNoteIds: number[] }> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) {
      throw new BadRequestException("Delivery note not found");
    }

    const extractedData = note.extractedData;
    if (!extractedData || !extractedData.rolls || extractedData.rolls.length === 0) {
      return { deliveryNoteIds: [note.id] };
    }

    const rollsByDnNumber = new Map<string, typeof extractedData.rolls>();
    extractedData.rolls
      .filter((roll) => roll != null && typeof roll === "object")
      .forEach((roll) => {
        const dnNumber = roll.deliveryNoteNumber || note.deliveryNoteNumber || `DN-${note.id}`;
        const existing = rollsByDnNumber.get(dnNumber) || [];
        existing.push(roll);
        rollsByDnNumber.set(dnNumber, existing);
      });

    if (rollsByDnNumber.size <= 1) {
      return { deliveryNoteIds: [note.id] };
    }

    const deliveryNoteIds: number[] = [];
    let isFirstGroup = true;

    for (const [dnNumber, rolls] of rollsByDnNumber) {
      const firstRoll = rolls[0];
      const deliveryDate = firstRoll.deliveryDate || extractedData.deliveryDate;

      if (isFirstGroup) {
        note.deliveryNoteNumber = dnNumber;
        note.deliveryDate = deliveryDate ? new Date(deliveryDate) : note.deliveryDate;
        note.extractedData = {
          ...extractedData,
          deliveryNoteNumber: dnNumber,
          deliveryDate,
          rolls,
        };
        await this.deliveryNoteRepository.save(note);
        deliveryNoteIds.push(note.id);
        isFirstGroup = false;
      } else {
        const newNote = this.deliveryNoteRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          deliveryNoteType: note.deliveryNoteType,
          deliveryNoteNumber: dnNumber,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          customerReference: note.customerReference,
          supplierCompanyId: note.supplierCompanyId,
          documentPath: note.documentPath,
          status: DeliveryNoteStatus.PENDING,
          createdBy: note.createdBy,
          extractedData: {
            ...extractedData,
            deliveryNoteNumber: dnNumber,
            deliveryDate,
            rolls,
          },
        });
        const savedNote = await this.deliveryNoteRepository.save(newNote);
        deliveryNoteIds.push(savedNote.id);
      }
    }

    return { deliveryNoteIds };
  }

  private mapDeliveryNoteToDto(note: RubberDeliveryNote): RubberDeliveryNoteDto {
    return {
      id: note.id,
      firebaseUid: note.firebaseUid,
      deliveryNoteType: note.deliveryNoteType,
      deliveryNoteTypeLabel: DELIVERY_NOTE_TYPE_LABELS[note.deliveryNoteType],
      deliveryNoteNumber: note.deliveryNoteNumber,
      deliveryDate: note.deliveryDate ? formatISODate(note.deliveryDate) : null,
      customerReference: note.customerReference,
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
      compoundType: item.compoundType,
      quantity: item.quantity,
      cocBatchNumbers: item.cocBatchNumbers,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async autoLinkToSupplierCoc(deliveryNoteId: number): Promise<number | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id: deliveryNoteId },
    });

    if (!note || note.linkedCocId) return note?.linkedCocId ?? null;

    const supplierCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.supplier_company_id = :companyId", {
        companyId: note.supplierCompanyId,
      })
      .orderBy("coc.id", "DESC")
      .getMany();

    if (supplierCocs.length === 0) return null;

    const batchRange = note.extractedData?.batchRange;
    const dnNumber = note.deliveryNoteNumber;

    const matched = supplierCocs.find((coc) => {
      const cocOrderNumber = (coc.orderNumber || coc.extractedData?.orderNumber || "")
        .trim()
        .toUpperCase();
      const cocBatches = [
        ...(coc.extractedData?.batchNumbers || []),
        ...(coc.extractedData?.batches || []).map((b) => b.batchNumber),
      ];

      if (batchRange && cocBatches.some((b) => batchRange.includes(b))) {
        return true;
      }

      if (cocOrderNumber && dnNumber.toUpperCase().includes(cocOrderNumber)) {
        return true;
      }

      return false;
    });

    if (!matched) return null;

    await this.linkToCoc(deliveryNoteId, matched.id);
    this.logger.log(
      `Auto-linked supplier DN ${deliveryNoteId} to CoC ${matched.id} (${matched.cocType})`,
    );
    return matched.id;
  }
}
