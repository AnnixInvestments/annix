import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { formatISODate, fromISO, generateUniqueId } from "../lib/datetime";
import {
  CreateDeliveryNoteDto,
  CreateDeliveryNoteItemDto,
  DeliveryNoteItemDto,
  RubberDeliveryNoteDto,
  UpdateDeliveryNoteDto,
} from "./dto/rubber-coc.dto";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";
import { CompoundMovementReferenceType } from "./entities/rubber-compound-movement.entity";
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
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberStockService } from "./rubber-stock.service";

const DELIVERY_NOTE_TYPE_LABELS: Record<DeliveryNoteType, string> = {
  [DeliveryNoteType.COMPOUND]: "Compound",
  [DeliveryNoteType.ROLL]: "Roll",
};

const DELIVERY_NOTE_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  [DeliveryNoteStatus.PENDING]: "Pending",
  [DeliveryNoteStatus.EXTRACTED]: "Extracted",
  [DeliveryNoteStatus.APPROVED]: "Approved",
  [DeliveryNoteStatus.LINKED]: "Linked",
  [DeliveryNoteStatus.STOCK_CREATED]: "Stock Created",
};

const parseCocNumberRolls = (cocNumber: string | null): string[] => {
  if (!cocNumber) return [];
  const dashIdx = cocNumber.indexOf("-");
  if (dashIdx < 0) return [];
  const rollPart = cocNumber.substring(dashIdx + 1).trim();
  if (!rollPart) return [];
  return rollPart
    .split(/[,\s]+/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0 && /^\d+$/.test(r));
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
    private rubberStockService: RubberStockService,
    private auCocReadinessService: RubberAuCocReadinessService,
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
      deliveryDate: dto.deliveryDate ? fromISO(dto.deliveryDate).toJSDate() : null,
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
      note.deliveryDate = dto.deliveryDate ? fromISO(dto.deliveryDate).toJSDate() : null;
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
      note.deliveryDate = fromISO(extractedData.deliveryDate).toJSDate();
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
      note.deliveryDate = fromISO(enrichedData.deliveryDate).toJSDate();
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

    this.triggerDownstreamAuCocGeneration(note);

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

  private triggerDownstreamAuCocGeneration(supplierDn: RubberDeliveryNote): void {
    this.findAndLinkMatchingCustomerDeliveryNotes(supplierDn)
      .then((customerDnIds) => {
        if (customerDnIds.length > 0) {
          this.logger.log(
            `SDN ${supplierDn.deliveryNoteNumber} linked to CoC — found and linked ${customerDnIds.length} matching CDN(s): ${customerDnIds.join(", ")}`,
          );
        }
        return Promise.all(
          customerDnIds.map((cdnId) =>
            this.auCocReadinessService.checkAndAutoGenerateForDeliveryNote(cdnId),
          ),
        );
      })
      .catch((error) => {
        this.logger.error(
          `Downstream AU CoC generation for SDN ${supplierDn.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  private async findAndLinkMatchingCustomerDeliveryNotes(
    supplierDn: RubberDeliveryNote,
  ): Promise<number[]> {
    const sdnRollNumbers = (supplierDn.extractedData?.rolls || [])
      .map((r) => r.rollNumber)
      .filter(Boolean) as string[];

    if (sdnRollNumbers.length === 0) return [];

    const customers = await this.companyRepository.find({
      where: { companyType: CompanyType.CUSTOMER },
    });

    if (customers.length === 0) return [];

    const customerIds = customers.map((c) => c.id);

    const customerDns = await this.deliveryNoteRepository
      .createQueryBuilder("dn")
      .where("dn.supplier_company_id IN (:...customerIds)", { customerIds })
      .andWhere("dn.delivery_note_type = :type", { type: DeliveryNoteType.ROLL })
      .getMany();

    if (customerDns.length === 0) return [];

    const sdnRollSet = new Set(sdnRollNumbers.map((rn) => rn.trim()));
    const sdnRollSuffixes = new Set(
      sdnRollNumbers.map((rn) => {
        const parts = rn.split("-");
        return parts.length >= 2 ? parts[parts.length - 1] : rn;
      }),
    );

    const matchingCdns = customerDns.filter((cdn) => {
      const cdnRolls = (cdn.extractedData?.rolls || [])
        .map((r) => r.rollNumber)
        .filter(Boolean) as string[];

      return cdnRolls.some((cdnRoll) => {
        const trimmed = cdnRoll.trim();
        if (sdnRollSet.has(trimmed)) return true;

        const parts = trimmed.split("-");
        const suffix = parts.length >= 2 ? parts[parts.length - 1] : trimmed;
        return sdnRollSuffixes.has(suffix);
      });
    });

    const cocId = supplierDn.linkedCocId;
    if (cocId) {
      const unlinkedCdns = matchingCdns.filter((cdn) => !cdn.linkedCocId);
      await Promise.all(
        unlinkedCdns.map((cdn) => {
          this.logger.log(
            `Auto-linking CDN ${cdn.deliveryNoteNumber} (id=${cdn.id}) to CoC ${cocId}`,
          );
          return this.linkToCoc(cdn.id, cocId);
        }),
      );
    }

    return matchingCdns.map((cdn) => cdn.id);
  }

  async finalizeDeliveryNote(id: number): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    note.status = DeliveryNoteStatus.STOCK_CREATED;
    await this.deliveryNoteRepository.save(note);

    await this.processCompoundStockOut(note);

    return this.mapDeliveryNoteToDto(note);
  }

  private async processCompoundStockOut(note: RubberDeliveryNote): Promise<void> {
    const alreadyProcessed = await this.rubberStockService.movementExistsForReference(
      CompoundMovementReferenceType.DELIVERY_DEDUCTION,
      note.id,
    );
    if (alreadyProcessed) return;

    const compoundCoding = await this.compoundCodingFromDeliveryNote(note);
    if (!compoundCoding) {
      this.logger.warn(
        `Delivery note ${note.deliveryNoteNumber}: could not resolve compound coding for stock deduction`,
      );
      return;
    }

    const items = await this.deliveryNoteItemRepository.find({
      where: { deliveryNoteId: note.id },
    });

    const totalKg = this.totalKgFromItems(note.deliveryNoteType, items);
    if (totalKg <= 0) {
      this.logger.warn(`Delivery note ${note.deliveryNoteNumber}: no kg to deduct from items`);
      return;
    }

    await this.rubberStockService.deductCompoundStockByCoding(
      compoundCoding.id,
      totalKg,
      CompoundMovementReferenceType.DELIVERY_DEDUCTION,
      note.id,
      `Delivery note ${note.deliveryNoteNumber}`,
    );

    this.logger.log(
      `Delivery note ${note.deliveryNoteNumber}: deducted ${totalKg} kg from compound stock for ${compoundCoding.code}`,
    );
  }

  private async compoundCodingFromDeliveryNote(
    note: RubberDeliveryNote,
  ): Promise<RubberProductCoding | null> {
    const compoundCode = note.linkedCoc?.compoundCode;
    if (compoundCode) {
      const coding = await this.productCodingRepository.findOne({
        where: { code: compoundCode, codingType: ProductCodingType.COMPOUND },
      });
      if (coding) return coding;
    }

    const items = await this.deliveryNoteItemRepository.find({
      where: { deliveryNoteId: note.id },
    });
    const itemWithCompound = items.find((item) => item.compoundType !== null);
    if (itemWithCompound?.compoundType) {
      const coding = await this.productCodingRepository.findOne({
        where: { code: itemWithCompound.compoundType, codingType: ProductCodingType.COMPOUND },
      });
      if (coding) return coding;
    }

    return null;
  }

  private totalKgFromItems(noteType: DeliveryNoteType, items: RubberDeliveryNoteItem[]): number {
    if (noteType === DeliveryNoteType.COMPOUND) {
      return items.reduce((sum, item) => sum + (item.weightKg ? Number(item.weightKg) : 0), 0);
    }
    return items.reduce(
      (sum, item) => sum + (item.rollWeightKg ? Number(item.rollWeightKg) : 0),
      0,
    );
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

    const compoundItems =
      note.deliveryNoteType === DeliveryNoteType.COMPOUND && extractedData.batchRange
        ? [
            this.deliveryNoteItemRepository.create({
              firebaseUid: `pg_${generateUniqueId()}`,
              deliveryNoteId,
              batchNumberStart: extractedData.batchRange.split("-")[0]?.trim() ?? null,
              batchNumberEnd: extractedData.batchRange.split("-")[1]?.trim() ?? null,
              weightKg: extractedData.totalWeightKg ?? null,
              linkedBatchIds: [],
            }),
          ]
        : [];

    const rollItems =
      note.deliveryNoteType === DeliveryNoteType.ROLL && extractedData.rolls
        ? extractedData.rolls.map((roll) =>
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
          )
        : [];

    const createdItems: RubberDeliveryNoteItem[] = [...compoundItems, ...rollItems];

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
      note.status = DeliveryNoteStatus.EXTRACTED;
      await this.deliveryNoteRepository.save(note);
      return { deliveryNoteIds: [note.id] };
    }

    const rollsByDnNumber = extractedData.rolls
      .filter((roll) => roll != null && typeof roll === "object")
      .reduce((map, roll) => {
        const dnNumber = roll.deliveryNoteNumber || note.deliveryNoteNumber || `DN-${note.id}`;
        const existing = map.get(dnNumber) || [];
        return new Map(map).set(dnNumber, [...existing, roll]);
      }, new Map<string, typeof extractedData.rolls>());

    if (rollsByDnNumber.size <= 1) {
      note.status = DeliveryNoteStatus.EXTRACTED;
      await this.deliveryNoteRepository.save(note);
      return { deliveryNoteIds: [note.id] };
    }

    const entries = Array.from(rollsByDnNumber.entries());
    const deliveryNoteIds = await entries.reduce(
      async (accPromise, [dnNumber, rolls], index) => {
        const acc = await accPromise;
        const firstRoll = rolls[0];
        const deliveryDate = firstRoll.deliveryDate || extractedData.deliveryDate;

        if (index === 0) {
          note.deliveryNoteNumber = dnNumber;
          note.deliveryDate = deliveryDate ? fromISO(deliveryDate).toJSDate() : note.deliveryDate;
          note.status = DeliveryNoteStatus.EXTRACTED;
          note.extractedData = {
            ...extractedData,
            deliveryNoteNumber: dnNumber,
            deliveryDate,
            rolls,
          };
          await this.deliveryNoteRepository.save(note);
          return [...acc, note.id];
        }

        const newNote = this.deliveryNoteRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          deliveryNoteType: note.deliveryNoteType,
          deliveryNoteNumber: dnNumber,
          deliveryDate: deliveryDate ? fromISO(deliveryDate).toJSDate() : null,
          customerReference: note.customerReference,
          supplierCompanyId: note.supplierCompanyId,
          documentPath: note.documentPath,
          status: DeliveryNoteStatus.EXTRACTED,
          createdBy: note.createdBy,
          extractedData: {
            ...extractedData,
            deliveryNoteNumber: dnNumber,
            deliveryDate,
            rolls,
          },
        });
        const savedNote = await this.deliveryNoteRepository.save(newNote);
        return [...acc, savedNote.id];
      },
      Promise.resolve([] as number[]),
    );

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
    const dnCustomerRef = (note.customerReference || note.extractedData?.customerReference || "")
      .trim()
      .toUpperCase();
    const dnRollNumbers = (note.extractedData?.rolls || [])
      .map((r) => r.rollNumber)
      .filter(Boolean) as string[];

    const matched = supplierCocs.find((coc) => {
      const cocOrderNumber = (coc.orderNumber || coc.extractedData?.orderNumber || "")
        .trim()
        .toUpperCase();
      const cocBatches = [
        ...(coc.extractedData?.batchNumbers || []),
        ...(coc.extractedData?.batches || []).map((b) => b.batchNumber),
      ];
      const cocRollNumbers: string[] = [...(coc.extractedData?.rollNumbers || [])].filter(Boolean);
      const cocRollParts =
        cocRollNumbers.length > 0
          ? cocRollNumbers.flatMap((rn: string) => {
              const parts = rn.split("-");
              return parts.length >= 2 ? [parts[parts.length - 1]] : [rn];
            })
          : parseCocNumberRolls(coc.cocNumber);

      if (batchRange && cocBatches.some((b) => batchRange.includes(b))) {
        return true;
      }

      if (cocOrderNumber && dnNumber.toUpperCase().includes(cocOrderNumber)) {
        return true;
      }

      const poMatch = cocOrderNumber && dnCustomerRef && cocOrderNumber === dnCustomerRef;
      const rollMatch =
        dnRollNumbers.length > 0 &&
        cocRollParts.length > 0 &&
        dnRollNumbers.some(
          (dnRoll) =>
            dnRoll != null &&
            cocRollParts.some((cocRoll) => dnRoll === cocRoll || dnRoll.endsWith(cocRoll)),
        );

      if (poMatch && rollMatch) {
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

  async autoLinkUnlinkedDnsToSupplierCoc(supplierCocId: number): Promise<number[]> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id: supplierCocId },
    });

    if (!coc) return [];

    const unlinkedNotes = await this.deliveryNoteRepository.find({
      where: [
        {
          supplierCompanyId: coc.supplierCompanyId,
          linkedCocId: IsNull(),
          status: DeliveryNoteStatus.PENDING,
        },
        {
          supplierCompanyId: coc.supplierCompanyId,
          linkedCocId: IsNull(),
          status: DeliveryNoteStatus.EXTRACTED,
        },
      ],
    });

    this.logger.log(
      `CoC ${supplierCocId}: type=${coc.cocType}, supplierCompanyId=${coc.supplierCompanyId}, orderNumber=${coc.orderNumber}, extractedOrderNumber=${coc.extractedData?.orderNumber}, rollNumbers=${JSON.stringify(coc.extractedData?.rollNumbers)}`,
    );

    if (unlinkedNotes.length === 0) {
      this.logger.log(
        `CoC ${supplierCocId}: no unlinked notes found for supplierCompanyId=${coc.supplierCompanyId}`,
      );
      return [];
    }

    const cocOrderNumber = (coc.orderNumber || coc.extractedData?.orderNumber || "")
      .trim()
      .toUpperCase();
    const cocBatches = [
      ...(coc.extractedData?.batchNumbers || []),
      ...(coc.extractedData?.batches || []).map((b: any) => b.batchNumber),
    ];
    const cocRollNumbers: string[] = [...(coc.extractedData?.rollNumbers || [])].filter(Boolean);
    const cocRollParts =
      cocRollNumbers.length > 0
        ? cocRollNumbers.flatMap((rn: string) => {
            const parts = rn.split("-");
            return parts.length >= 2 ? [parts[parts.length - 1]] : [rn];
          })
        : parseCocNumberRolls(coc.cocNumber);

    this.logger.log(
      `CoC ${supplierCocId}: cocOrderNumber="${cocOrderNumber}", cocBatches=${JSON.stringify(cocBatches)}, cocRollParts=${JSON.stringify(cocRollParts)}, unlinkedNotes=${unlinkedNotes.length}`,
    );

    const linkedIds = await unlinkedNotes.reduce(
      async (accPromise, note) => {
        const acc = await accPromise;
        const batchRange = note.extractedData?.batchRange;
        const dnNumber = note.deliveryNoteNumber;
        const dnCustomerRef = (
          note.customerReference ||
          note.extractedData?.customerReference ||
          ""
        )
          .trim()
          .toUpperCase();
        const dnRollNumbers = (note.extractedData?.rolls || [])
          .map((r) => r.rollNumber)
          .filter(Boolean);

        const batchMatch = batchRange && cocBatches.some((b: string) => batchRange.includes(b));
        const orderMatch = cocOrderNumber && dnNumber.toUpperCase().includes(cocOrderNumber);
        const poMatch = cocOrderNumber && dnCustomerRef && cocOrderNumber === dnCustomerRef;
        const rollMatch =
          dnRollNumbers.length > 0 &&
          cocRollParts.length > 0 &&
          dnRollNumbers.some(
            (dnRoll) =>
              dnRoll != null &&
              cocRollParts.some((cocRoll) => dnRoll === cocRoll || dnRoll.endsWith(cocRoll)),
          );

        this.logger.log(
          `CoC ${supplierCocId} vs DN ${note.id} (${dnNumber}): customerRef="${dnCustomerRef}", dnRolls=${JSON.stringify(dnRollNumbers)}, batchRange="${batchRange}", batchMatch=${batchMatch}, orderMatch=${orderMatch}, poMatch=${poMatch}, rollMatch=${rollMatch}`,
        );

        if (batchMatch || orderMatch || (poMatch && rollMatch)) {
          await this.linkToCoc(note.id, supplierCocId);
          this.logger.log(
            `Auto-linked unlinked DN ${note.id} (${dnNumber}) to CoC ${supplierCocId}`,
          );
          return [...acc, note.id];
        }

        return acc;
      },
      Promise.resolve([] as number[]),
    );

    return linkedIds;
  }

  async bulkAutoLinkAllUnlinkedDns(): Promise<{ linked: number; details: string[] }> {
    const [allCocs, allUnlinkedNotes] = await Promise.all([
      this.supplierCocRepository.find(),
      this.deliveryNoteRepository.find({
        where: [
          { linkedCocId: IsNull(), status: DeliveryNoteStatus.PENDING },
          { linkedCocId: IsNull(), status: DeliveryNoteStatus.EXTRACTED },
        ],
      }),
    ]);

    const notesBySupplier = allUnlinkedNotes.reduce(
      (map, note) => {
        const key = note.supplierCompanyId;
        return { ...map, [key]: [...(map[key] || []), note] };
      },
      {} as Record<number, RubberDeliveryNote[]>,
    );

    const result = await allCocs.reduce(
      async (accPromise, coc) => {
        const acc = await accPromise;
        const supplierNotes = notesBySupplier[coc.supplierCompanyId] || [];
        if (supplierNotes.length === 0) return acc;

        const cocOrderNumber = (coc.orderNumber || coc.extractedData?.orderNumber || "")
          .trim()
          .toUpperCase();
        const cocBatches = [
          ...(coc.extractedData?.batchNumbers || []),
          ...(coc.extractedData?.batches || []).map((b: any) => b.batchNumber),
        ];
        const cocRollNumbers: string[] = [...(coc.extractedData?.rollNumbers || [])].filter(
          Boolean,
        );
        const cocRollParts =
          cocRollNumbers.length > 0
            ? cocRollNumbers.flatMap((rn: string) => {
                const parts = rn.split("-");
                return parts.length >= 2 ? [parts[parts.length - 1]] : [rn];
              })
            : parseCocNumberRolls(coc.cocNumber);

        const matchedNotes = supplierNotes.filter((note) => {
          const batchRange = note.extractedData?.batchRange;
          const dnNumber = note.deliveryNoteNumber;
          const dnCustomerRef = (
            note.customerReference ||
            note.extractedData?.customerReference ||
            ""
          )
            .trim()
            .toUpperCase();
          const dnRollNumbers = (note.extractedData?.rolls || [])
            .map((r) => r.rollNumber)
            .filter(Boolean);

          const batchMatch = batchRange && cocBatches.some((b: string) => batchRange.includes(b));
          const orderMatch = cocOrderNumber && dnNumber.toUpperCase().includes(cocOrderNumber);
          const poMatch = cocOrderNumber && dnCustomerRef && cocOrderNumber === dnCustomerRef;
          const rollMatch =
            dnRollNumbers.length > 0 &&
            cocRollParts.length > 0 &&
            dnRollNumbers.some(
              (dnRoll) =>
                dnRoll != null &&
                cocRollParts.some((cocRoll) => dnRoll === cocRoll || dnRoll.endsWith(cocRoll)),
            );

          return batchMatch || orderMatch || (poMatch && rollMatch);
        });

        if (matchedNotes.length === 0) return acc;

        await matchedNotes.reduce(async (linkPromise, note) => {
          await linkPromise;
          await this.linkToCoc(note.id, coc.id);
          this.logger.log(
            `Auto-linked unlinked DN ${note.id} (${note.deliveryNoteNumber}) to CoC ${coc.id}`,
          );
        }, Promise.resolve());

        notesBySupplier[coc.supplierCompanyId] = supplierNotes.filter(
          (n) => !matchedNotes.some((m) => m.id === n.id),
        );

        return {
          linked: acc.linked + matchedNotes.length,
          details: [
            ...acc.details,
            `CoC ${coc.id}: linked ${matchedNotes.length} DN(s) [${matchedNotes.map((n) => n.id).join(", ")}]`,
          ],
        };
      },
      Promise.resolve({ linked: 0, details: [] as string[] }),
    );

    this.logger.log(
      `Bulk auto-link complete: ${result.linked} DN(s) linked across ${allCocs.length} CoC(s)`,
    );
    return result;
  }
}
