import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateAnnixOrbitShortlistDto,
  UpdateAnnixOrbitShortlistDto,
} from "../dto/annix-orbit-shortlist.dto";
import {
  type AnnixOrbitShortlist,
  type AnnixOrbitShortlistStatus,
} from "../entities/annix-orbit-shortlist.entity";
import { AnnixOrbitShortlistRepository } from "../repositories/annix-orbit-shortlist.repository";
import { type AnnixOrbitAuditActor, AnnixOrbitAuditService } from "./annix-orbit-audit.service";

@Injectable()
export class AnnixOrbitShortlistService {
  constructor(
    private readonly shortlistRepo: AnnixOrbitShortlistRepository,
    private readonly auditService: AnnixOrbitAuditService,
  ) {}

  findForCompany(companyId: number): Promise<AnnixOrbitShortlist[]> {
    return this.shortlistRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitShortlist> {
    const shortlist = await this.shortlistRepo.findByIdForCompany(id, companyId);
    if (!shortlist) {
      throw new NotFoundException("Shortlist not found");
    }
    return shortlist;
  }

  create(companyId: number, dto: CreateAnnixOrbitShortlistDto): Promise<AnnixOrbitShortlist> {
    return this.shortlistRepo.create({
      companyId,
      name: dto.name,
      jobTitle: dto.jobTitle ?? null,
      clientId: dto.clientId ?? null,
      candidateIds: dto.candidateIds ?? [],
      status: (dto.status ?? "draft") as AnnixOrbitShortlistStatus,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    actor: AnnixOrbitAuditActor,
    dto: UpdateAnnixOrbitShortlistDto,
  ): Promise<AnnixOrbitShortlist> {
    const shortlist = await this.findByIdForCompany(id, companyId);
    const previousStatus = shortlist.status;
    shortlist.name = dto.name;
    shortlist.jobTitle = dto.jobTitle ?? null;
    shortlist.clientId = dto.clientId ?? null;
    shortlist.candidateIds = dto.candidateIds ?? [];
    shortlist.status = (dto.status ?? "draft") as AnnixOrbitShortlistStatus;
    shortlist.notes = dto.notes ?? null;
    const saved = await this.shortlistRepo.save(shortlist);

    if (saved.status === "sent" && previousStatus !== "sent") {
      const memberIds = saved.candidateIds ?? [];
      await Promise.all(
        memberIds.map((candidateId) =>
          this.auditService.record(companyId, actor, {
            action: "shortlist_sent",
            candidateId,
            shortlistId: saved.id,
            clientId: saved.clientId,
            detail: `Included in shortlist "${saved.name}" sent to client`,
          }),
        ),
      );
    }

    return saved;
  }

  async remove(id: number, companyId: number): Promise<void> {
    const shortlist = await this.findByIdForCompany(id, companyId);
    await this.shortlistRepo.remove(shortlist);
  }
}
