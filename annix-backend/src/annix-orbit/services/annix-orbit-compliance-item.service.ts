import { Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import {
  CreateAnnixOrbitComplianceItemDto,
  UpdateAnnixOrbitComplianceItemDto,
} from "../dto/annix-orbit-compliance-item.dto";
import {
  type AnnixOrbitComplianceItem,
  type AnnixOrbitComplianceStatus,
} from "../entities/annix-orbit-compliance-item.entity";
import { AnnixOrbitComplianceItemRepository } from "../repositories/annix-orbit-compliance-item.repository";

const EXPIRING_WINDOW_DAYS = 30;

// Expiring/expired are derived from the expiry date instead of relying on a
// recruiter to flip them by hand (issue #337). A received/verified document
// whose expiry falls inside the warning window reads as "expiring"; one whose
// expiry has passed reads as "expired". Derivation happens on read so the
// status is always current without a cron.
function deriveStatus(
  status: AnnixOrbitComplianceStatus,
  expiryDate: string | null,
): AnnixOrbitComplianceStatus {
  if (!expiryDate || status === "missing") {
    return status;
  }
  const expiry = DateTime.fromISO(expiryDate);
  if (!expiry.isValid) {
    return status;
  }
  const today = DateTime.now().startOf("day");
  if (expiry < today) {
    return "expired";
  }
  if (expiry <= today.plus({ days: EXPIRING_WINDOW_DAYS })) {
    return "expiring";
  }
  // An item manually marked expiring/expired whose date moved out again
  // settles back on "received" - "verified" survives untouched.
  if (status === "expiring" || status === "expired") {
    return "received";
  }
  return status;
}

@Injectable()
export class AnnixOrbitComplianceItemService {
  constructor(private readonly complianceRepo: AnnixOrbitComplianceItemRepository) {}

  private withDerivedStatus(item: AnnixOrbitComplianceItem): AnnixOrbitComplianceItem {
    item.status = deriveStatus(item.status, item.expiryDate);
    return item;
  }

  async findForCompany(companyId: number): Promise<AnnixOrbitComplianceItem[]> {
    const items = await this.complianceRepo.findByCompany(companyId);
    return items.map((item) => this.withDerivedStatus(item));
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitComplianceItem> {
    const item = await this.complianceRepo.findByIdForCompany(id, companyId);
    if (!item) {
      throw new NotFoundException("Compliance item not found");
    }
    return this.withDerivedStatus(item);
  }

  create(
    companyId: number,
    dto: CreateAnnixOrbitComplianceItemDto,
  ): Promise<AnnixOrbitComplianceItem> {
    return this.complianceRepo.create({
      companyId,
      candidateId: dto.candidateId,
      documentType: dto.documentType,
      status: (dto.status ?? "missing") as AnnixOrbitComplianceStatus,
      expiryDate: dto.expiryDate ?? null,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitComplianceItemDto,
  ): Promise<AnnixOrbitComplianceItem> {
    const item = await this.findByIdForCompany(id, companyId);
    item.documentType = dto.documentType;
    item.status = (dto.status ?? "missing") as AnnixOrbitComplianceStatus;
    item.expiryDate = dto.expiryDate ?? null;
    item.notes = dto.notes ?? null;
    return this.complianceRepo.save(item);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const item = await this.findByIdForCompany(id, companyId);
    await this.complianceRepo.remove(item);
  }
}
