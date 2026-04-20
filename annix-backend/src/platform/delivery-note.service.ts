import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type {
  CreateDeliveryNoteDto,
  DeliveryNoteFilterDto,
  UpdateDeliveryNoteDto,
} from "./dto/delivery-note.dto";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExtractionStatus,
  PlatformDeliveryNote,
} from "./entities/delivery-note.entity";

export interface DeliveryNotePage {
  data: PlatformDeliveryNote[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class DeliveryNoteService {
  private readonly logger = new Logger(DeliveryNoteService.name);

  constructor(
    @InjectRepository(PlatformDeliveryNote)
    private readonly dnRepo: Repository<PlatformDeliveryNote>,
  ) {}

  async findById(companyId: number, id: number): Promise<PlatformDeliveryNote> {
    const dn = await this.dnRepo.findOne({
      where: { id, companyId },
      relations: ["items", "supplierContact"],
    });

    if (!dn) {
      throw new NotFoundException(`Delivery note ${id} not found`);
    }

    return dn;
  }

  async search(companyId: number, filters: DeliveryNoteFilterDto): Promise<DeliveryNotePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.dnRepo
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.supplierContact", "supplier")
      .where("dn.company_id = :companyId", { companyId })
      .andWhere("dn.version_status = :versionStatus", { versionStatus: "ACTIVE" });

    if (filters.sourceModule) {
      qb.andWhere("dn.source_module = :sourceModule", { sourceModule: filters.sourceModule });
    }

    if (filters.deliveryNoteType) {
      qb.andWhere("dn.delivery_note_type = :dnType", { dnType: filters.deliveryNoteType });
    }

    if (filters.status) {
      qb.andWhere("dn.status = :status", { status: filters.status });
    }

    if (filters.supplierContactId) {
      qb.andWhere("dn.supplier_contact_id = :supplierId", {
        supplierId: filters.supplierContactId,
      });
    }

    if (filters.search) {
      qb.andWhere(
        "(dn.delivery_number ILIKE :search OR dn.supplier_name ILIKE :search OR dn.customer_reference ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy("dn.created_at", "DESC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async create(companyId: number, dto: CreateDeliveryNoteDto): Promise<PlatformDeliveryNote> {
    const dn = this.dnRepo.create({
      companyId,
      sourceModule: dto.sourceModule,
      deliveryNumber: dto.deliveryNumber,
      deliveryNoteType: dto.deliveryNoteType ?? DeliveryNoteType.GENERAL,
      status: DeliveryNoteStatus.PENDING,
      supplierName: dto.supplierName ?? null,
      supplierContactId: dto.supplierContactId ?? null,
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
      customerReference: dto.customerReference ?? null,
      notes: dto.notes ?? null,
      receivedBy: dto.receivedBy ?? null,
      createdBy: dto.createdBy ?? null,
    });

    return this.dnRepo.save(dn);
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateDeliveryNoteDto,
  ): Promise<PlatformDeliveryNote> {
    const dn = await this.findById(companyId, id);
    Object.assign(dn, dto);
    return this.dnRepo.save(dn);
  }

  async setExtractedData(
    id: number,
    extractedData: Record<string, unknown>,
  ): Promise<PlatformDeliveryNote> {
    const dn = await this.dnRepo.findOneBy({ id });
    if (!dn) {
      throw new NotFoundException(`Delivery note ${id} not found`);
    }

    dn.extractedData = extractedData;
    dn.extractionStatus = ExtractionStatus.COMPLETED;
    dn.status = DeliveryNoteStatus.EXTRACTED;

    return this.dnRepo.save(dn);
  }

  async updateStatus(
    companyId: number,
    id: number,
    status: DeliveryNoteStatus,
  ): Promise<PlatformDeliveryNote> {
    const dn = await this.findById(companyId, id);
    dn.status = status;
    return this.dnRepo.save(dn);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const dn = await this.findById(companyId, id);
    await this.dnRepo.remove(dn);
  }

  async findByLegacyScId(scDeliveryNoteId: number): Promise<PlatformDeliveryNote | null> {
    return this.dnRepo.findOne({
      where: { legacyScDeliveryNoteId: scDeliveryNoteId },
    });
  }

  async findByLegacyRubberId(rubberDeliveryNoteId: number): Promise<PlatformDeliveryNote | null> {
    return this.dnRepo.findOne({
      where: { legacyRubberDeliveryNoteId: rubberDeliveryNoteId },
    });
  }
}
