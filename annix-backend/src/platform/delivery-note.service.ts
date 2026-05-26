import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DeliveryNoteRepository } from "./delivery-note.repository";
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

  constructor(private readonly dnRepo: DeliveryNoteRepository) {}

  async findById(companyId: number, id: number): Promise<PlatformDeliveryNote> {
    const dn = await this.dnRepo.findByCompanyAndId(companyId, id, ["items", "supplierContact"]);

    if (!dn) {
      throw new NotFoundException(`Delivery note ${id} not found`);
    }

    return dn;
  }

  search(companyId: number, filters: DeliveryNoteFilterDto): Promise<DeliveryNotePage> {
    return this.dnRepo.search(companyId, filters);
  }

  async create(companyId: number, dto: CreateDeliveryNoteDto): Promise<PlatformDeliveryNote> {
    return this.dnRepo.create({
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
    const dn = await this.dnRepo.findById(id);
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

  findByLegacyScId(scDeliveryNoteId: number): Promise<PlatformDeliveryNote | null> {
    return this.dnRepo.findByLegacyScId(scDeliveryNoteId);
  }

  findByLegacyRubberId(rubberDeliveryNoteId: number): Promise<PlatformDeliveryNote | null> {
    return this.dnRepo.findByLegacyRubberId(rubberDeliveryNoteId);
  }
}
