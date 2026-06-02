import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateAnnixOrbitTalentCandidateDto,
  UpdateAnnixOrbitTalentCandidateDto,
} from "../dto/annix-orbit-talent-candidate.dto";
import {
  type AnnixOrbitCandidateVisibility,
  type AnnixOrbitTalentCandidate,
  type AnnixOrbitTalentCandidateStatus,
} from "../entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";

@Injectable()
export class AnnixOrbitTalentCandidateService {
  constructor(private readonly candidateRepo: AnnixOrbitTalentCandidateRepository) {}

  findForCompany(companyId: number, userId: number): Promise<AnnixOrbitTalentCandidate[]> {
    return this.candidateRepo.findVisibleForCompany(companyId, userId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTalentCandidate> {
    const candidate = await this.candidateRepo.findByIdForCompany(id, companyId);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    return candidate;
  }

  create(
    companyId: number,
    userId: number,
    dto: CreateAnnixOrbitTalentCandidateDto,
  ): Promise<AnnixOrbitTalentCandidate> {
    return this.candidateRepo.create({
      companyId,
      ownerUserId: userId,
      visibility: (dto.visibility ?? "agency") as AnnixOrbitCandidateVisibility,
      fullName: dto.fullName,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      currentRole: dto.currentRole ?? null,
      province: dto.province ?? null,
      city: dto.city ?? null,
      yearsExperience: dto.yearsExperience ?? null,
      skills: dto.skills ?? null,
      salaryExpectation: dto.salaryExpectation ?? null,
      availability: dto.availability ?? null,
      noticePeriod: dto.noticePeriod ?? null,
      willingToRelocate: dto.willingToRelocate ?? false,
      status: (dto.status ?? "active") as AnnixOrbitTalentCandidateStatus,
      notes: dto.notes ?? null,
      consentToShare: dto.consentToShare ?? false,
      consentGivenAt: dto.consentGivenAt ?? null,
      consentSource: dto.consentSource ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitTalentCandidateDto,
  ): Promise<AnnixOrbitTalentCandidate> {
    const candidate = await this.findByIdForCompany(id, companyId);
    candidate.visibility = (dto.visibility ??
      candidate.visibility) as AnnixOrbitCandidateVisibility;
    candidate.fullName = dto.fullName;
    candidate.email = dto.email ?? null;
    candidate.phone = dto.phone ?? null;
    candidate.currentRole = dto.currentRole ?? null;
    candidate.province = dto.province ?? null;
    candidate.city = dto.city ?? null;
    candidate.yearsExperience = dto.yearsExperience ?? null;
    candidate.skills = dto.skills ?? null;
    candidate.salaryExpectation = dto.salaryExpectation ?? null;
    candidate.availability = dto.availability ?? null;
    candidate.noticePeriod = dto.noticePeriod ?? null;
    candidate.willingToRelocate = dto.willingToRelocate ?? false;
    candidate.status = (dto.status ?? "active") as AnnixOrbitTalentCandidateStatus;
    candidate.notes = dto.notes ?? null;
    candidate.consentToShare = dto.consentToShare ?? false;
    candidate.consentGivenAt = dto.consentGivenAt ?? null;
    candidate.consentSource = dto.consentSource ?? null;
    return this.candidateRepo.save(candidate);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const candidate = await this.findByIdForCompany(id, companyId);
    await this.candidateRepo.remove(candidate);
  }
}
