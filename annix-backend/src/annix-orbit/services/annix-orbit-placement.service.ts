import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateAnnixOrbitPlacementDto,
  UpdateAnnixOrbitPlacementDto,
} from "../dto/annix-orbit-placement.dto";
import {
  type AnnixOrbitPlacement,
  type AnnixOrbitPlacementInvoiceStatus,
  type AnnixOrbitPlacementStatus,
} from "../entities/annix-orbit-placement.entity";
import { AnnixOrbitPlacementRepository } from "../repositories/annix-orbit-placement.repository";

@Injectable()
export class AnnixOrbitPlacementService {
  constructor(private readonly placementRepo: AnnixOrbitPlacementRepository) {}

  findForCompany(companyId: number): Promise<AnnixOrbitPlacement[]> {
    return this.placementRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitPlacement> {
    const placement = await this.placementRepo.findByIdForCompany(id, companyId);
    if (!placement) {
      throw new NotFoundException("Placement not found");
    }
    return placement;
  }

  create(companyId: number, dto: CreateAnnixOrbitPlacementDto): Promise<AnnixOrbitPlacement> {
    return this.placementRepo.create({
      companyId,
      clientId: dto.clientId ?? null,
      candidateName: dto.candidateName,
      jobTitle: dto.jobTitle,
      salary: dto.salary ?? null,
      placementFee: dto.placementFee ?? null,
      startDate: dto.startDate ?? null,
      guaranteeUntil: dto.guaranteeUntil ?? null,
      status: (dto.status ?? "offer_accepted") as AnnixOrbitPlacementStatus,
      invoiceStatus: (dto.invoiceStatus ?? "not_invoiced") as AnnixOrbitPlacementInvoiceStatus,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitPlacementDto,
  ): Promise<AnnixOrbitPlacement> {
    const placement = await this.findByIdForCompany(id, companyId);
    placement.clientId = dto.clientId ?? null;
    placement.candidateName = dto.candidateName;
    placement.jobTitle = dto.jobTitle;
    placement.salary = dto.salary ?? null;
    placement.placementFee = dto.placementFee ?? null;
    placement.startDate = dto.startDate ?? null;
    placement.guaranteeUntil = dto.guaranteeUntil ?? null;
    placement.status = (dto.status ?? "offer_accepted") as AnnixOrbitPlacementStatus;
    placement.invoiceStatus = (dto.invoiceStatus ??
      "not_invoiced") as AnnixOrbitPlacementInvoiceStatus;
    placement.notes = dto.notes ?? null;
    return this.placementRepo.save(placement);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const placement = await this.findByIdForCompany(id, companyId);
    await this.placementRepo.remove(placement);
  }
}
