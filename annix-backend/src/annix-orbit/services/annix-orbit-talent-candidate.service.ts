import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import {
  CreateAnnixOrbitTalentCandidateDto,
  UpdateAnnixOrbitTalentCandidateDto,
} from "../dto/annix-orbit-talent-candidate.dto";
import {
  type AnnixOrbitCandidateSource,
  type AnnixOrbitCandidateVisibility,
  type AnnixOrbitTalentCandidate,
  type AnnixOrbitTalentCandidateStatus,
  type OrbitPipelineStage,
} from "../entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import { type AnnixOrbitAuditActor, AnnixOrbitAuditService } from "./annix-orbit-audit.service";
import { CvExtractionService } from "./cv-extraction.service";
import { EmbeddingService } from "./embedding.service";

export interface AnnixOrbitCvAutofill {
  fullName: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  yearsExperience: number | null;
  city: string | null;
  summary: string | null;
  // Persisted CV (issue #337): stored file path + extracted text travel back so
  // the create/update call can link them to the candidate record.
  cvFilePath: string | null;
  cvText: string | null;
}

export const RECRUITER_EXTRACT_METRIC_CATEGORY = "annix-orbit-recruiter";
export const RECRUITER_CV_EXTRACT_OPERATION = "talent-cv-extract";

@Injectable()
export class AnnixOrbitTalentCandidateService {
  private readonly logger = new Logger(AnnixOrbitTalentCandidateService.name);

  constructor(
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly auditService: AnnixOrbitAuditService,
    private readonly cvExtractionService: CvExtractionService,
    private readonly embeddingService: EmbeddingService,
    private readonly metrics: ExtractionMetricService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async extractCvAutofill(
    companyId: number,
    file: Express.Multer.File,
  ): Promise<AnnixOrbitCvAutofill> {
    // Persist the CV first (issue #337: it used to be parsed and discarded),
    // then extract under the metric that feeds the branded progress modal.
    const subPath = `${StorageArea.ANNIX_ORBIT}/recruiter/${companyId}/cv`;
    const stored = await this.storageService.upload(file, subPath);
    const { text, data } = await this.metrics.time(
      RECRUITER_EXTRACT_METRIC_CATEGORY,
      RECRUITER_CV_EXTRACT_OPERATION,
      () => this.cvExtractionService.processBuffer(file.buffer, file.originalname),
    );
    return {
      fullName: data.candidateName ?? "",
      email: data.email ?? null,
      phone: data.phone ?? null,
      skills: data.skills ?? [],
      yearsExperience: data.experienceYears ?? null,
      city: data.location ?? null,
      summary: data.summary ?? null,
      cvFilePath: stored.path,
      cvText: text,
    };
  }

  // Learned duration estimates that seed the branded progress modals.
  async extractEstimates(): Promise<{ cvExtractMs: number; messageDraftMs: number }> {
    const cvStats = await this.metrics.stats(
      RECRUITER_EXTRACT_METRIC_CATEGORY,
      RECRUITER_CV_EXTRACT_OPERATION,
    );
    const draftStats = await this.metrics.stats(RECRUITER_EXTRACT_METRIC_CATEGORY, "message-draft");
    const cvAverage = cvStats.averageMs;
    const draftAverage = draftStats.averageMs;
    return {
      cvExtractMs: cvAverage != null && cvAverage > 0 ? Math.round(cvAverage) : 25_000,
      messageDraftMs: draftAverage != null && draftAverage > 0 ? Math.round(draftAverage) : 10_000,
    };
  }

  // Embeds the candidate's profile + CV text in the background so the
  // job-match endpoint has a vector to compare against (issue #337).
  private async refreshEmbedding(candidateId: number, companyId: number): Promise<void> {
    const candidate = await this.candidateRepo.findByIdForCompany(candidateId, companyId);
    if (!candidate) return;
    const skills = candidate.skills ? candidate.skills.join(", ") : "";
    const parts = [
      candidate.fullName,
      candidate.currentRole ?? "",
      skills,
      candidate.province ?? "",
      candidate.city ?? "",
      candidate.notes ?? "",
      candidate.cvText ?? "",
    ];
    const text = parts.filter((part) => part.trim().length > 0).join(" ");
    if (!text) return;
    const embedding = await this.embeddingService.generateEmbedding(text);
    if (!embedding) return;
    candidate.embedding = embedding;
    await this.candidateRepo.save(candidate);
  }

  private queueEmbeddingRefresh(candidateId: number, companyId: number): void {
    void this.refreshEmbedding(candidateId, companyId).catch((err) => {
      this.logger.warn(
        `Talent candidate embedding refresh failed for ${candidateId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

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

  async create(
    companyId: number,
    userId: number,
    dto: CreateAnnixOrbitTalentCandidateDto,
  ): Promise<AnnixOrbitTalentCandidate> {
    const created = await this.candidateRepo.create({
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
      pipelineStage: (dto.pipelineStage ?? "identified") as OrbitPipelineStage,
      source: (dto.source ?? "database") as AnnixOrbitCandidateSource,
      notes: dto.notes ?? null,
      consentToShare: dto.consentToShare ?? false,
      consentGivenAt: dto.consentGivenAt ?? null,
      consentSource: dto.consentSource ?? null,
      cvText: dto.cvText ?? null,
      cvFilePath: dto.cvFilePath ?? null,
    });
    this.queueEmbeddingRefresh(created.id, companyId);
    return created;
  }

  async update(
    id: number,
    companyId: number,
    actor: AnnixOrbitAuditActor,
    dto: UpdateAnnixOrbitTalentCandidateDto,
  ): Promise<AnnixOrbitTalentCandidate> {
    const candidate = await this.findByIdForCompany(id, companyId);
    const previousConsent = candidate.consentToShare;
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
    candidate.pipelineStage = (dto.pipelineStage ?? candidate.pipelineStage) as OrbitPipelineStage;
    candidate.source = (dto.source ?? candidate.source) as AnnixOrbitCandidateSource;
    candidate.notes = dto.notes ?? null;
    candidate.consentToShare = dto.consentToShare ?? false;
    candidate.consentGivenAt = dto.consentGivenAt ?? null;
    candidate.consentSource = dto.consentSource ?? null;
    if (dto.cvText !== undefined) candidate.cvText = dto.cvText;
    if (dto.cvFilePath !== undefined) candidate.cvFilePath = dto.cvFilePath;
    const saved = await this.candidateRepo.save(candidate);
    this.queueEmbeddingRefresh(saved.id, companyId);

    const nextConsent = saved.consentToShare;
    if (nextConsent !== previousConsent) {
      await this.auditService.record(companyId, actor, {
        action: nextConsent ? "consent_given" : "consent_withdrawn",
        candidateId: saved.id,
        detail: nextConsent
          ? `Consent to share captured for ${saved.fullName}`
          : `Consent to share withdrawn for ${saved.fullName}`,
      });
    }

    return saved;
  }

  async remove(id: number, companyId: number): Promise<void> {
    const candidate = await this.findByIdForCompany(id, companyId);
    await this.candidateRepo.remove(candidate);
  }
}
