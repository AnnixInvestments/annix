import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { now } from "../../lib/datetime";
import { LicensingService } from "../../licensing/licensing.service";
import {
  ANNIX_ORBIT_RECRUITER_FEATURES,
  ANNIX_ORBIT_RECRUITER_MODULE_KEY,
} from "../config/annix-orbit-recruiter-licensing";
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
import { type AnnixOrbitAuditActor, AnnixOrbitAuditService } from "./annix-orbit-audit.service";

@Injectable()
export class AnnixOrbitSubmissionService {
  constructor(
    private readonly submissionRepo: AnnixOrbitSubmissionRepository,
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly auditService: AnnixOrbitAuditService,
    private readonly licensing: LicensingService,
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
    actor: AnnixOrbitAuditActor,
    dto: CreateAnnixOrbitSubmissionDto,
  ): Promise<AnnixOrbitSubmission> {
    const allowed = await this.licensing.isFeatureEnabled(
      companyId,
      ANNIX_ORBIT_RECRUITER_MODULE_KEY,
      ANNIX_ORBIT_RECRUITER_FEATURES.SUBMISSIONS,
    );
    if (!allowed) {
      throw new ForbiddenException(
        "Submitting candidates to clients is part of the Recruit plan. Upgrade to start submitting.",
      );
    }
    const candidate = await this.candidateRepo.findByIdForCompany(dto.candidateId, companyId);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    if (!candidate.consentToShare) {
      throw new BadRequestException(
        "This candidate has not consented to be submitted to clients. Capture POPIA consent on the candidate before submitting.",
      );
    }

    const submission = await this.submissionRepo.create({
      companyId,
      consultantUserId: actor.id,
      candidateId: dto.candidateId,
      clientId: dto.clientId ?? null,
      jobTitle: dto.jobTitle,
      status: (dto.status ?? "submitted") as AnnixOrbitSubmissionStatus,
      submittedAt: now().toISO(),
      interviewAt: dto.interviewAt ?? null,
      feedback: dto.feedback ?? null,
      notes: dto.notes ?? null,
    });

    await this.auditService.record(companyId, actor, {
      action: "candidate_submitted",
      candidateId: dto.candidateId,
      submissionId: submission.id,
      clientId: dto.clientId ?? null,
      detail: `Submitted ${candidate.fullName} for "${dto.jobTitle}"`,
    });

    return submission;
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
    if (dto.interviewAt !== undefined) submission.interviewAt = dto.interviewAt;
    submission.feedback = dto.feedback ?? null;
    submission.notes = dto.notes ?? null;
    return this.submissionRepo.save(submission);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const submission = await this.findByIdForCompany(id, companyId);
    await this.submissionRepo.remove(submission);
  }
}
