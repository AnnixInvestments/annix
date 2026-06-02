import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import {
  CreateAnnixOrbitSubmissionDto,
  UpdateAnnixOrbitSubmissionDto,
} from "../dto/annix-orbit-submission.dto";
import {
  type AnnixOrbitSubmission,
  type AnnixOrbitSubmissionStatus,
} from "../entities/annix-orbit-submission.entity";
import { AnnixOrbitSubmissionRepository } from "../repositories/annix-orbit-submission.repository";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";

@Injectable()
export class AnnixOrbitSubmissionService {
  constructor(
    private readonly submissionRepo: AnnixOrbitSubmissionRepository,
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
  ) {}

  findForCompany(companyId: number): Promise<AnnixOrbitSubmission[]> {
    return this.submissionRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitSubmission> {
    const submission = await this.submissionRepo.findByIdForCompany(id, companyId);
    if (!submission) {
      throw new NotFoundException("Submission not found");
    }
    return submission;
  }

  async create(
    companyId: number,
    dto: CreateAnnixOrbitSubmissionDto,
  ): Promise<AnnixOrbitSubmission> {
    const candidate = await this.candidateRepo.findByIdForCompany(dto.candidateId, companyId);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    if (!candidate.consentToShare) {
      throw new BadRequestException(
        "This candidate has not consented to be submitted to clients. Capture POPIA consent on the candidate before submitting.",
      );
    }

    return this.submissionRepo.create({
      companyId,
      candidateId: dto.candidateId,
      clientId: dto.clientId ?? null,
      jobTitle: dto.jobTitle,
      status: (dto.status ?? "submitted") as AnnixOrbitSubmissionStatus,
      submittedAt: now().toISO(),
      feedback: dto.feedback ?? null,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitSubmissionDto,
  ): Promise<AnnixOrbitSubmission> {
    const submission = await this.findByIdForCompany(id, companyId);
    submission.clientId = dto.clientId ?? null;
    submission.jobTitle = dto.jobTitle;
    submission.status = (dto.status ?? submission.status) as AnnixOrbitSubmissionStatus;
    submission.feedback = dto.feedback ?? null;
    submission.notes = dto.notes ?? null;
    return this.submissionRepo.save(submission);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const submission = await this.findByIdForCompany(id, companyId);
    await this.submissionRepo.remove(submission);
  }
}
