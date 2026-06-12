import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateAnnixOrbitRecruiterInterviewDto,
  UpdateAnnixOrbitRecruiterInterviewDto,
} from "../dto/annix-orbit-recruiter-interview.dto";
import {
  type AnnixOrbitInterviewStatus,
  type AnnixOrbitInterviewType,
  type AnnixOrbitRecruiterInterview,
} from "../entities/annix-orbit-recruiter-interview.entity";
import { AnnixOrbitRecruiterInterviewRepository } from "../repositories/annix-orbit-recruiter-interview.repository";

@Injectable()
export class AnnixOrbitRecruiterInterviewService {
  constructor(private readonly interviewRepo: AnnixOrbitRecruiterInterviewRepository) {}

  findForCompany(companyId: number): Promise<AnnixOrbitRecruiterInterview[]> {
    return this.interviewRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitRecruiterInterview> {
    const interview = await this.interviewRepo.findByIdForCompany(id, companyId);
    if (!interview) {
      throw new NotFoundException("Interview not found");
    }
    return interview;
  }

  create(
    companyId: number,
    dto: CreateAnnixOrbitRecruiterInterviewDto,
  ): Promise<AnnixOrbitRecruiterInterview> {
    return this.interviewRepo.create({
      companyId,
      candidateId: dto.candidateId ?? null,
      clientId: dto.clientId ?? null,
      candidateName: dto.candidateName,
      jobTitle: dto.jobTitle ?? null,
      scheduledAt: dto.scheduledAt ?? null,
      interviewType: (dto.interviewType ?? "video") as AnnixOrbitInterviewType,
      status: (dto.status ?? "scheduled") as AnnixOrbitInterviewStatus,
      feedback: dto.feedback ?? null,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitRecruiterInterviewDto,
  ): Promise<AnnixOrbitRecruiterInterview> {
    const interview = await this.findByIdForCompany(id, companyId);
    interview.candidateId = dto.candidateId ?? null;
    interview.clientId = dto.clientId ?? null;
    interview.candidateName = dto.candidateName;
    interview.jobTitle = dto.jobTitle ?? null;
    interview.scheduledAt = dto.scheduledAt ?? null;
    interview.interviewType = (dto.interviewType ?? "video") as AnnixOrbitInterviewType;
    interview.status = (dto.status ?? "scheduled") as AnnixOrbitInterviewStatus;
    interview.feedback = dto.feedback ?? null;
    interview.notes = dto.notes ?? null;
    return this.interviewRepo.save(interview);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const interview = await this.findByIdForCompany(id, companyId);
    await this.interviewRepo.remove(interview);
  }
}
