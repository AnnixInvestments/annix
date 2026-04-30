import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { formatISODate, generateUniqueId } from "../lib/datetime";
import { PaginatedResult } from "../lib/dto/pagination-query.dto";
import {
  CreateDeliveryNoteDto,
  CreateDeliveryNoteItemDto,
  DeliveryNoteItemDto,
  RubberDeliveryNoteDto,
  UpdateDeliveryNoteDto,
} from "./dto/rubber-coc.dto";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  DocumentVersionStatus,
} from "./entities/document-version.types";
import { RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";
import { CompoundMovementReferenceType } from "./entities/rubber-compound-movement.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExtractedDeliveryNoteData,
  RubberDeliveryNote,
} from "./entities/rubber-delivery-note.entity";
import { RubberDeliveryNoteCorrection } from "./entities/rubber-delivery-note-correction.entity";
import { RubberDeliveryNoteItem } from "./entities/rubber-delivery-note-item.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { ExtractedCocData, RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";
import { RubberStockService } from "./rubber-stock.service";

const DELIVERY_NOTE_TYPE_LABELS: Record<DeliveryNoteType, string> = {
  [DeliveryNoteType.COMPOUND]: "Compound",
  [DeliveryNoteType.ROLL]: "Roll",
};

const DELIVERY_NOTE_SORT_MAP: Record<string, string> = {
  deliveryNoteNumber: "dn.delivery_note_number",
  deliveryDate: "dn.delivery_date",
  deliveryNoteType: "dn.delivery_note_type",
  status: "dn.status",
  supplierCompanyName: "company.name",
  customerCompanyName: "company.name",
  customerReference: "dn.customer_reference",
  auCocNumber: "coc.coc_number",
  createdAt: "dn.created_at",
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
    @InjectRepository(RubberDeliveryNoteCorrection)
    private correctionRepository: Repository<RubberDeliveryNoteCorrection>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberProduct)
    private productRepository: Repository<RubberProduct>,
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
    @InjectRepository(RubberAuCoc)
    private auCocRepository: Repository<RubberAuCoc>,
    private rubberStockService: RubberStockService,
    private auCocReadinessService: RubberAuCocReadinessService,
    private versioningService: RubberDocumentVersioningService,
  ) {}

  async allDeliveryNotes(filters?: {
    deliveryNoteType?: DeliveryNoteType;
    status?: DeliveryNoteStatus;
    supplierCompanyId?: number;
    companyType?: CompanyType;
    includeAllVersions?: boolean;
  }): Promise<RubberDeliveryNoteDto[]> {
    const query = this.deliveryNoteRepository
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.supplierCompany", "company")
      .leftJoinAndSelect("dn.linkedCoc", "coc")
      .orderBy("dn.created_at", "DESC");

    if (!filters?.includeAllVersions) {
      query.andWhere("dn.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }

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
    if (filters?.companyType) {
      query.andWhere("company.company_type = :companyType", {
        companyType: filters.companyType,
      });
    }

    const notes = await query.getMany();
    const noteIds = notes.map((n) => n.id);
    const auCocMap = noteIds.length > 0 ? await this.auCocMapByDeliveryNoteIds(noteIds) : new Map();
    return notes.map((dn) => this.mapDeliveryNoteToDto(dn, auCocMap.get(dn.id) ?? null));
  }

  async paginatedDeliveryNotes(filters?: {
    deliveryNoteType?: DeliveryNoteType;
    status?: DeliveryNoteStatus;
    supplierCompanyId?: number;
    companyType?: CompanyType;
    includeAllVersions?: boolean;
    search?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<RubberDeliveryNoteDto>> {
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.max(1, Math.min(10000, filters?.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const query = this.deliveryNoteRepository
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.supplierCompany", "company")
      .leftJoinAndSelect("dn.linkedCoc", "coc");

    if (!filters?.includeAllVersions) {
      query.andWhere("dn.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }
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
    if (filters?.companyType) {
      query.andWhere("company.company_type = :companyType", {
        companyType: filters.companyType,
      });
    }
    if (filters?.search) {
      query.andWhere(
        "(dn.delivery_note_number ILIKE :search OR dn.customer_reference ILIKE :search OR company.name ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    const sortKey = filters?.sortColumn ?? "createdAt";
    const sortColumn = DELIVERY_NOTE_SORT_MAP[sortKey] ?? "dn.created_at";
    const sortDirection = filters?.sortDirection === "asc" ? "ASC" : "DESC";
    query.orderBy(sortColumn, sortDirection, "NULLS LAST");
    query.addOrderBy("dn.id", "DESC");

    const total = await query.clone().getCount();

    query.offset(skip).limit(pageSize);
    const notes = await query.getMany();
    const noteIds = notes.map((n) => n.id);
    const auCocMap = noteIds.length > 0 ? await this.auCocMapByDeliveryNoteIds(noteIds) : new Map();
    return {
      items: notes.map((dn) => this.mapDeliveryNoteToDto(dn, auCocMap.get(dn.id) ?? null)),
      total,
      page,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
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

    const existingActive = dto.deliveryNoteNumber
      ? await this.versioningService.existingActiveDeliveryNote(
          dto.deliveryNoteNumber,
          dto.supplierCompanyId,
        )
      : null;

    const isDuplicate = existingActive !== null;

    const note = this.deliveryNoteRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      deliveryNoteType: dto.deliveryNoteType,
      deliveryNoteNumber: dto.deliveryNoteNumber,
      deliveryDate: dto.deliveryDate || null,
      customerReference: dto.customerReference ?? null,
      supplierCompanyId: dto.supplierCompanyId,
      documentPath: dto.documentPath ?? null,
      stockCategory: dto.stockCategory ?? null,
      status: DeliveryNoteStatus.PENDING,
      createdBy: createdBy ?? null,
      version: isDuplicate ? existingActive.version + 1 : 1,
      previousVersionId: isDuplicate ? existingActive.id : null,
      versionStatus: isDuplicate
        ? DocumentVersionStatus.PENDING_AUTHORIZATION
        : DocumentVersionStatus.ACTIVE,
    });

    if (isDuplicate) {
      this.logger.log(
        `Duplicate delivery note detected: ${dto.deliveryNoteNumber} for supplier ${dto.supplierCompanyId} - creating v${note.version} pending authorization`,
      );
    }

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
      note.deliveryDate = (dto.deliveryDate as unknown as Date) || null;
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
    const isAutoGeneratedDn = (note.deliveryNoteNumber || "").match(/^DN-\d+$/);
    if (extractedData.deliveryNoteNumber && (!note.deliveryNoteNumber || isAutoGeneratedDn)) {
      note.deliveryNoteNumber = extractedData.deliveryNoteNumber;
    }
    if (extractedData.deliveryDate && !note.deliveryDate) {
      note.deliveryDate = extractedData.deliveryDate as unknown as Date;
    }
    if (extractedData.customerReference && !note.customerReference) {
      note.customerReference = extractedData.customerReference;
    }

    if (
      extractedData.deliveryNoteNumber &&
      note.versionStatus === DocumentVersionStatus.ACTIVE &&
      note.version === 1
    ) {
      const existingActive = await this.versioningService.existingActiveDeliveryNote(
        extractedData.deliveryNoteNumber,
        note.supplierCompanyId,
      );
      if (existingActive && existingActive.id !== note.id) {
        note.version = existingActive.version + 1;
        note.previousVersionId = existingActive.id;
        note.versionStatus = DocumentVersionStatus.PENDING_AUTHORIZATION;
        this.logger.log(
          `Post-extraction duplicate detected: delivery note ${extractedData.deliveryNoteNumber} matches existing #${existingActive.id} - marking v${note.version} pending authorization`,
        );
      }
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

    const previousData = note.extractedData ?? null;
    const supplierName = note.supplierCompany?.name ?? null;
    const corrections = this.diffDeliveryNoteForCorrections(previousData, correctedData);

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
      note.deliveryDate = enrichedData.deliveryDate as unknown as Date;
    }
    if (enrichedData.customerReference !== undefined) {
      note.customerReference = enrichedData.customerReference || null;
    }

    await this.deliveryNoteRepository.save(note);

    if (corrections.length > 0 && supplierName) {
      const correctionEntities = corrections.map((c) =>
        this.correctionRepository.create({
          deliveryNoteId: id,
          supplierName,
          fieldName: c.field,
          originalValue: c.original,
          correctedValue: c.corrected,
          correctedBy: null,
        }),
      );
      await this.correctionRepository.save(correctionEntities);
      this.logger.log(
        `Saved ${correctionEntities.length} delivery-note correction(s) for ${supplierName} on note #${id}`,
      );
    }

    return this.mapDeliveryNoteToDto(note);
  }

  private diffDeliveryNoteForCorrections(
    previous: ExtractedDeliveryNoteData | null,
    next: ExtractedDeliveryNoteData,
  ): { field: string; original: string; corrected: string }[] {
    const corrections: { field: string; original: string; corrected: string }[] = [];

    const dnLevelFields: (keyof ExtractedDeliveryNoteData)[] = [
      "deliveryNoteNumber",
      "deliveryDate",
      "customerReference",
      "customerName",
      "supplierName",
      "batchRange",
    ];
    dnLevelFields.forEach((field) => {
      const prevValue = previous ? previous[field] : null;
      const nextValue = next[field];
      if (nextValue !== undefined && nextValue !== prevValue) {
        const original = prevValue == null ? "" : String(prevValue);
        const corrected = nextValue == null ? "" : String(nextValue);
        if (original !== corrected) {
          corrections.push({ field: String(field), original, corrected });
        }
      }
    });

    const previousRollsByNumber = new Map<
      string,
      NonNullable<ExtractedDeliveryNoteData["rolls"]>[number]
    >();
    (previous?.rolls ?? []).forEach((roll) => {
      if (roll?.rollNumber) previousRollsByNumber.set(roll.rollNumber, roll);
    });

    const rollFields: (keyof NonNullable<ExtractedDeliveryNoteData["rolls"]>[number])[] = [
      "compoundCode",
      "thicknessMm",
      "widthMm",
      "lengthM",
      "weightKg",
    ];
    (next.rolls ?? []).forEach((roll) => {
      if (!roll?.rollNumber) return;
      const prevRoll = previousRollsByNumber.get(roll.rollNumber);
      rollFields.forEach((field) => {
        const prevValue = prevRoll ? prevRoll[field] : null;
        const nextValue = roll[field];
        if (nextValue !== undefined && nextValue !== prevValue) {
          const original = prevValue == null ? "" : String(prevValue);
          const corrected = nextValue == null ? "" : String(nextValue);
          if (original !== corrected) {
            corrections.push({
              field: `roll[${roll.rollNumber}].${String(field)}`,
              original,
              corrected,
            });
          }
        }
      });
    });

    return corrections;
  }

  async correctionHintsForDnSupplier(supplierName: string | null): Promise<string | null> {
    if (!supplierName) return null;

    const recentCorrections = await this.correctionRepository.find({
      where: { supplierName },
      order: { createdAt: "DESC" },
      take: 40,
    });

    if (recentCorrections.length === 0) return null;

    const fieldGroups = recentCorrections.reduce((map, c) => {
      const baseField = c.fieldName.startsWith("roll[")
        ? c.fieldName.replace(/^roll\[[^\]]+\]\./, "roll.")
        : c.fieldName;
      const list = map.get(baseField) ?? [];
      return new Map(map).set(baseField, [...list, c]);
    }, new Map<string, RubberDeliveryNoteCorrection[]>());

    const lines = Array.from(fieldGroups.entries()).flatMap(([field, group]) => {
      const samples = group
        .slice(0, 5)
        .map((c) => `  • "${c.originalValue ?? ""}" → "${c.correctedValue}"`);
      return [`- Field "${field}" was corrected ${group.length} time(s) recently:`, ...samples];
    });

    return `PREVIOUS CORRECTIONS FOR THIS SUPPLIER (learn from these patterns and apply them on this DN):\n${lines.join("\n")}\n\nWhen you encounter the same source pattern, prefer the corrected output over your default extraction. Pay particular attention to repeated compoundCode reformatting (e.g. raw "SC38 RED" → "RSCA38") — apply the AU-format rule to every roll.`;
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

      const linkedButNotStatusUpdated = matchingCdns.filter(
        (cdn) => cdn.linkedCocId && cdn.status !== DeliveryNoteStatus.LINKED,
      );
      await Promise.all(
        linkedButNotStatusUpdated.map(async (cdn) => {
          cdn.status = DeliveryNoteStatus.LINKED;
          await this.deliveryNoteRepository.save(cdn);
          this.logger.log(
            `Fixed status for CDN ${cdn.deliveryNoteNumber} (id=${cdn.id}): ${cdn.status} → LINKED`,
          );
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

  async approveDeliveryNote(id: number): Promise<RubberDeliveryNoteDto | null> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id },
      relations: ["supplierCompany", "linkedCoc"],
    });
    if (!note) return null;

    if (note.status !== DeliveryNoteStatus.EXTRACTED) {
      throw new BadRequestException(
        `Delivery note must be in EXTRACTED state to approve (current: ${note.status})`,
      );
    }

    note.status = DeliveryNoteStatus.APPROVED;
    await this.deliveryNoteRepository.save(note);

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

    if (note.linkedCoc?.extractedData) {
      const cocData = note.linkedCoc.extractedData as ExtractedCocData | null;
      const cocCompound = cocData?.compoundCode;
      if (cocCompound) {
        const strippedCode = cocCompound.replace(/-/g, "");
        const coding = await this.productCodingRepository.findOne({
          where: { code: strippedCode, codingType: ProductCodingType.COMPOUND },
        });
        if (coding) return coding;

        const snMatch = strippedCode.match(/AU[A-Z]\d{2}[A-Z]{1,2}[A-Z]{2}[A-Z0-9]{2,3}/i);
        if (snMatch) {
          const code = snMatch[0].toUpperCase();
          const existing = await this.productCodingRepository.findOne({
            where: { code, codingType: ProductCodingType.COMPOUND },
          });
          if (existing) return existing;
        }
      }
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
      itemCategory: dto.itemCategory ?? "ROLL",
      description: dto.description ?? null,
      quantity: dto.quantity ? Math.round(dto.quantity) : null,
      cocBatchNumbers: dto.cocBatchNumbers ?? null,
    });

    const sg = await this.specificGravityForDeliveryNote(note);
    this.calculateWeightDeviation(item, sg);

    const saved = await this.deliveryNoteItemRepository.save(item);
    return this.mapDeliveryNoteItemToDto(saved);
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

  async setPodPageNumbers(id: number, podPageNumbers: number[]): Promise<void> {
    await this.deliveryNoteRepository.update(id, {
      podPageNumbers: podPageNumbers.length > 0 ? podPageNumbers : null,
    });
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
    if (!extractedData?.rolls || extractedData.rolls.length === 0) {
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

    const suppliers = await this.companyRepository.find({
      where: { companyType: CompanyType.SUPPLIER },
    });

    const noteDnNumber = note.deliveryNoteNumber;
    const isPlaceholderDn = !noteDnNumber || /^DN-\d+$/.test(noteDnNumber);
    const isReExtract = !isPlaceholderDn && rollsByDnNumber.has(noteDnNumber);
    if (isReExtract) {
      const ownRolls = rollsByDnNumber.get(noteDnNumber) ?? [];
      note.extractedData = {
        ...extractedData,
        deliveryNoteNumber: noteDnNumber,
        rolls: ownRolls,
      };
      note.supplierCompanyId = this.resolveSupplierFromRolls(
        ownRolls,
        suppliers,
        note.supplierCompanyId,
      );
      note.status = DeliveryNoteStatus.EXTRACTED;
      note.sourcePageNumbers = this.sourcePagesFromRolls(ownRolls);
      await this.deliveryNoteRepository.save(note);
      this.logger.log(
        `Re-extract on existing DN ${noteDnNumber} (#${note.id}) — kept own rolls (${ownRolls.length}), skipped splitting against ${rollsByDnNumber.size - 1} sibling DN(s) already in the system`,
      );
      return { deliveryNoteIds: [note.id] };
    }

    if (rollsByDnNumber.size <= 1) {
      const extractedDnNumber =
        extractedData.deliveryNoteNumber || Array.from(rollsByDnNumber.keys())[0];
      if (extractedDnNumber) {
        note.deliveryNoteNumber = extractedDnNumber;
      }

      const singleRolls = Array.from(rollsByDnNumber.values())[0] || [];
      const resolvedSupplierId = this.resolveSupplierFromRolls(
        singleRolls,
        suppliers,
        note.supplierCompanyId,
      );
      note.supplierCompanyId = resolvedSupplierId;
      note.status = DeliveryNoteStatus.EXTRACTED;
      note.sourcePageNumbers = this.sourcePagesFromRolls(singleRolls);

      const existingActive = extractedDnNumber
        ? await this.versioningService.existingActiveDeliveryNote(
            extractedDnNumber,
            resolvedSupplierId,
          )
        : null;
      if (existingActive && existingActive.id !== note.id) {
        note.version = existingActive.version + 1;
        note.previousVersionId = existingActive.id;
        note.versionStatus = DocumentVersionStatus.PENDING_AUTHORIZATION;
        this.logger.log(
          `Split single-DN duplicate detected: ${extractedDnNumber} matches existing #${existingActive.id} - marking v${note.version} pending authorization`,
        );
      }

      await this.deliveryNoteRepository.save(note);
      return { deliveryNoteIds: [note.id] };
    }

    const entries = Array.from(rollsByDnNumber.entries());
    const deliveryNoteIds = await entries.reduce(
      async (accPromise, [dnNumber, rolls], index) => {
        const acc = await accPromise;
        const firstRoll = rolls[0];
        const deliveryDate = firstRoll.deliveryDate || extractedData.deliveryDate;
        const rollExtractedData = {
          ...extractedData,
          deliveryNoteNumber: dnNumber,
          deliveryDate,
          rolls,
        };

        const resolvedSupplierId = this.resolveSupplierFromRolls(
          rolls,
          suppliers,
          note.supplierCompanyId,
        );

        const existingActive = await this.versioningService.existingActiveDeliveryNote(
          dnNumber,
          resolvedSupplierId,
        );

        if (index === 0) {
          note.deliveryNoteNumber = dnNumber;
          note.deliveryDate = deliveryDate ? (deliveryDate as unknown as Date) : note.deliveryDate;
          note.supplierCompanyId = resolvedSupplierId;
          note.status = DeliveryNoteStatus.EXTRACTED;
          note.extractedData = rollExtractedData;
          note.sourcePageNumbers = this.sourcePagesFromRolls(rolls);
          if (existingActive && existingActive.id !== note.id) {
            note.version = existingActive.version + 1;
            note.previousVersionId = existingActive.id;
            note.versionStatus = DocumentVersionStatus.PENDING_AUTHORIZATION;
            this.logger.log(
              `Split duplicate detected: ${dnNumber} matches existing #${existingActive.id} - marking v${note.version} pending authorization`,
            );
          }
          await this.deliveryNoteRepository.save(note);
          return [...acc, note.id];
        }

        if (existingActive) {
          this.logger.log(
            `Split duplicate detected: ${dnNumber} matches existing #${existingActive.id} - skipping creation`,
          );
          return acc;
        }

        const newNote = this.deliveryNoteRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          deliveryNoteType: note.deliveryNoteType,
          deliveryNoteNumber: dnNumber,
          deliveryDate: deliveryDate ? (deliveryDate as unknown as Date) : null,
          customerReference: note.customerReference,
          supplierCompanyId: resolvedSupplierId,
          documentPath: note.documentPath,
          status: DeliveryNoteStatus.EXTRACTED,
          createdBy: note.createdBy,
          extractedData: rollExtractedData,
          sourcePageNumbers: this.sourcePagesFromRolls(rolls),
        });
        const savedNote = await this.deliveryNoteRepository.save(newNote);
        return [...acc, savedNote.id];
      },
      Promise.resolve([] as number[]),
    );

    return { deliveryNoteIds };
  }

  private sourcePagesFromRolls(rolls: { sourcePages?: number[] | null }[]): number[] | null {
    const pages = rolls.flatMap((r) =>
      Array.isArray(r.sourcePages) ? r.sourcePages.filter((p) => Number.isInteger(p) && p > 0) : [],
    );
    if (pages.length === 0) return null;
    const unique = Array.from(new Set(pages)).sort((a, b) => a - b);
    return unique;
  }

  private resolveSupplierFromRolls(
    rolls: { supplierName?: string | null }[],
    suppliers: RubberCompany[],
    fallbackSupplierId: number,
  ): number {
    const supplierName = rolls.find((r) => r.supplierName)?.supplierName;
    if (!supplierName) return fallbackSupplierId;

    const nameLower = supplierName.toLowerCase();

    const SUPPLIER_PATTERNS: { pattern: (s: string) => boolean; match: (c: string) => boolean }[] =
      [
        {
          pattern: (s) =>
            s.includes("s&n") || s.includes("s & n") || s.includes("calendered products"),
          match: (c) => c.includes("s&n") || c.includes("s & n"),
        },
        {
          pattern: (s) => s.includes("impilo"),
          match: (c) => c.includes("impilo"),
        },
        {
          pattern: (s) => s.includes("au industrie"),
          match: (c) => c.includes("au industrie"),
        },
      ];

    const matched = SUPPLIER_PATTERNS.find((p) => p.pattern(nameLower));
    if (matched) {
      const company = suppliers.find((c) => matched.match(c.name.toLowerCase()));
      if (company) {
        this.logger.log(
          `Resolved supplier from extraction: "${supplierName}" → ${company.name} (#${company.id})`,
        );
        return company.id;
      }
    }

    const fuzzyMatch = suppliers.find(
      (c) => c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase()),
    );
    if (fuzzyMatch) {
      this.logger.log(
        `Fuzzy-matched supplier from extraction: "${supplierName}" → ${fuzzyMatch.name} (#${fuzzyMatch.id})`,
      );
      return fuzzyMatch.id;
    }

    return fallbackSupplierId;
  }

  private async auCocMapByDeliveryNoteIds(
    dnIds: number[],
  ): Promise<Map<number, { id: number; cocNumber: string }>> {
    const auCocs = await this.auCocRepository
      .createQueryBuilder("ac")
      .select(["ac.id", "ac.cocNumber", "ac.sourceDeliveryNoteId"])
      .where("ac.source_delivery_note_id IN (:...dnIds)", { dnIds })
      .getMany();

    return auCocs.reduce((map, ac) => {
      if (ac.sourceDeliveryNoteId) {
        map.set(ac.sourceDeliveryNoteId, { id: ac.id, cocNumber: ac.cocNumber });
      }
      return map;
    }, new Map<number, { id: number; cocNumber: string }>());
  }

  private mapDeliveryNoteToDto(
    note: RubberDeliveryNote,
    auCoc?: { id: number; cocNumber: string } | null,
  ): RubberDeliveryNoteDto {
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
      auCocId: auCoc?.id ?? null,
      auCocNumber: auCoc?.cocNumber ?? null,
      extractedData: note.extractedData,
      createdBy: note.createdBy,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      version: note.version,
      versionStatus: note.versionStatus,
      versionStatusLabel: DOCUMENT_VERSION_STATUS_LABELS[note.versionStatus],
      previousVersionId: note.previousVersionId,
      stockCategory: note.stockCategory || null,
      podPageNumbers: note.podPageNumbers || null,
      sourcePageNumbers: note.sourcePageNumbers || null,
    };
  }

  private mapDeliveryNoteItemToDto(item: RubberDeliveryNoteItem): DeliveryNoteItemDto {
    const theoreticalWeightKg = item.theoreticalWeightKg ? Number(item.theoreticalWeightKg) : null;
    const weightDeviationPct = item.weightDeviationPct ? Number(item.weightDeviationPct) : null;

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
      itemCategory: item.itemCategory || "ROLL",
      description: item.description,
      quantity: item.quantity,
      cocBatchNumbers: item.cocBatchNumbers,
      theoreticalWeightKg,
      weightDeviationPct,
      weightFlagged: weightDeviationPct !== null && Math.abs(weightDeviationPct) > 5,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private calculateWeightDeviation(item: RubberDeliveryNoteItem, specificGravity: number): void {
    const thicknessMm = item.thicknessMm ? Number(item.thicknessMm) : null;
    const widthMm = item.widthMm ? Number(item.widthMm) : null;
    const lengthM = item.lengthM ? Number(item.lengthM) : null;
    const rollWeightKg = item.rollWeightKg ? Number(item.rollWeightKg) : null;

    if (thicknessMm === null || widthMm === null || lengthM === null) {
      return;
    }

    const theoretical = (thicknessMm / 1000) * (widthMm / 1000) * lengthM * specificGravity * 1000;
    item.theoreticalWeightKg = (Math.round(theoretical * 1000) / 1000) as any;

    if (rollWeightKg !== null && theoretical > 0) {
      const deviation = ((rollWeightKg - theoretical) / theoretical) * 100;
      item.weightDeviationPct = (Math.round(deviation * 100) / 100) as any;
    }
  }

  private async specificGravityForDeliveryNote(note: RubberDeliveryNote): Promise<number> {
    const DEFAULT_SG = 1.05;

    const extractedSg = note.extractedData?.rolls
      ?.map((r) => r.specificGravity)
      .find((sg) => sg !== null && sg !== undefined && sg > 0);
    if (extractedSg) {
      return extractedSg;
    }

    const compoundCoding = await this.compoundCodingFromDeliveryNote(note);
    if (compoundCoding) {
      const product = await this.productRepository.findOne({
        where: { compoundFirebaseUid: compoundCoding.firebaseUid },
      });
      if (product?.specificGravity) {
        return Number(product.specificGravity);
      }
    }

    return DEFAULT_SG;
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

  async bulkLinkCustomerDnsFromLinkedSupplierDns(): Promise<{
    linked: number;
    details: string[];
  }> {
    const linkedSupplierDns = await this.deliveryNoteRepository.find({
      where: {
        status: DeliveryNoteStatus.LINKED,
        linkedCocId: Not(IsNull()),
      },
    });

    const supplierCompanies = await this.companyRepository.find({
      where: { companyType: CompanyType.SUPPLIER },
    });
    const supplierIds = new Set(supplierCompanies.map((c) => c.id));

    const sdns = linkedSupplierDns.filter((dn) => supplierIds.has(dn.supplierCompanyId));

    if (sdns.length === 0) {
      return { linked: 0, details: ["No linked SDNs found to cascade from"] };
    }

    const results = await sdns.reduce(
      async (accPromise, sdn) => {
        const acc = await accPromise;
        const cdnIds = await this.findAndLinkMatchingCustomerDeliveryNotes(sdn);
        if (cdnIds.length === 0) return acc;

        return {
          linked: acc.linked + cdnIds.length,
          details: [
            ...acc.details,
            `SDN ${sdn.deliveryNoteNumber} (CoC ${sdn.linkedCocId}): linked ${cdnIds.length} CDN(s) [${cdnIds.join(", ")}]`,
          ],
        };
      },
      Promise.resolve({ linked: 0, details: [] as string[] }),
    );

    this.logger.log(
      `Bulk CDN link complete: ${results.linked} CDN(s) linked from ${sdns.length} SDN(s)`,
    );
    return results;
  }
}
