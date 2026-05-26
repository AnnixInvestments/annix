import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { now } from "../../lib/datetime";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { CompanyRepository } from "../../platform/company.repository";
import { CreateJobPostingDto, UpdateJobPostingDto } from "../dto/job-posting.dto";
import { UpdateJobWizardDto } from "../dto/job-wizard.dto";
import {
  EmploymentType,
  JobPosting,
  JobPostingStatus,
  WorkMode,
} from "../entities/job-posting.entity";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { JobScreeningQuestionRepository } from "../repositories/job-screening-question.repository";
import { JobSkillRepository } from "../repositories/job-skill.repository";
import { JobSuccessMetricRepository } from "../repositories/job-success-metric.repository";
import { PortalPostingOrchestrator } from "./portal-posting-orchestrator.service";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REF_LENGTH = 6;
const MAX_REF_ATTEMPTS = 8;

export const ANNIX_ORBIT_APPLICATIONS_INBOX = "jobs@annix.co.za";

export interface PublicJobPostingDto {
  referenceNumber: string;
  title: string;
  description: string | null;
  location: string | null;
  province: string | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  requiredEducation: string | null;
  requiredCertifications: string[];
  minExperienceYears: number | null;
  responseTimelineDays: number;
  applyByEmail: string | null;
  postedAt: Date;
  companyName: string | null;
}

@Injectable()
export class JobPostingService {
  private readonly logger = new Logger(JobPostingService.name);

  constructor(
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly companyRepo: CompanyRepository,
    private readonly jobSkillRepo: JobSkillRepository,
    private readonly jobSuccessMetricRepo: JobSuccessMetricRepository,
    private readonly jobScreeningQuestionRepo: JobScreeningQuestionRepository,
    private readonly portalPostingOrchestrator: PortalPostingOrchestrator,
    private readonly txRunner: TransactionRunner,
  ) {}

  /**
   * Phase 1 wizard: create an empty draft so the user can navigate through
   * the wizard saving partial state. Returns the new posting (no relations
   * loaded — they'll all be empty).
   */
  async createDraft(companyId: number): Promise<JobPosting> {
    const referenceNumber = await this.allocateReferenceNumber();
    return this.jobPostingRepo.create({
      companyId,
      title: "Untitled draft",
      status: JobPostingStatus.DRAFT,
      referenceNumber,
      salaryCurrency: "ZAR",
      responseTimelineDays: 14,
      requiredSkills: [],
      requiredCertifications: [],
      enabledPortalCodes: [],
      benefits: [],
    });
  }

  /**
   * Phase 1 wizard: load a draft with all child collections so the wizard
   * can hydrate any step. Loads relations explicitly (no `eager: true` per
   * CLAUDE.md Neon network transfer budget).
   */
  async findWizardDraft(companyId: number, id: number): Promise<JobPosting> {
    const draft = await this.jobPostingRepo.findWizardDraft(id, companyId);
    if (!draft) {
      throw new NotFoundException("Job posting not found");
    }
    return draft;
  }

  /**
   * Phase 1 wizard: partial save. Scalar fields update via merge; child
   * collections (skills/successMetrics/screeningQuestions) replace-in-full
   * if present. Wrapped in a transaction so a partial failure rolls back.
   */
  async updateWizardDraft(
    companyId: number,
    id: number,
    dto: UpdateJobWizardDto,
  ): Promise<JobPosting> {
    return this.txRunner.run(async (ctx) => {
      const jobRepo = this.jobPostingRepo.withTransaction(ctx);
      const draft = await jobRepo.findByIdForCompany(id, companyId);
      if (!draft) {
        throw new NotFoundException("Job posting not found");
      }

      this.applyScalarFields(draft, dto);
      await jobRepo.save(draft);

      if (dto.skills !== undefined) {
        const skillRepo = this.jobSkillRepo.withTransaction(ctx);
        await skillRepo.deleteByJobPosting(draft.id);
        if (dto.skills.length > 0) {
          await Promise.all(
            dto.skills.map((s, index) =>
              skillRepo.create({
                jobPostingId: draft.id,
                name: s.name,
                importance: s.importance,
                proficiency: s.proficiency,
                yearsExperience: s.yearsExperience ?? null,
                evidenceRequired: s.evidenceRequired ?? null,
                weight: s.weight ?? 5,
                sortOrder: s.sortOrder ?? index,
              }),
            ),
          );
        }
      }

      if (dto.successMetrics !== undefined) {
        const metricRepo = this.jobSuccessMetricRepo.withTransaction(ctx);
        await metricRepo.deleteByJobPosting(draft.id);
        if (dto.successMetrics.length > 0) {
          await Promise.all(
            dto.successMetrics.map((m, index) =>
              metricRepo.create({
                jobPostingId: draft.id,
                timeframe: m.timeframe,
                metric: m.metric,
                sortOrder: m.sortOrder ?? index,
              }),
            ),
          );
        }
      }

      if (dto.screeningQuestions !== undefined) {
        const questionRepo = this.jobScreeningQuestionRepo.withTransaction(ctx);
        await questionRepo.deleteByJobPosting(draft.id);
        if (dto.screeningQuestions.length > 0) {
          await Promise.all(
            dto.screeningQuestions.map((q, index) =>
              questionRepo.create({
                jobPostingId: draft.id,
                question: q.question,
                questionType: q.questionType,
                options: q.options ?? null,
                disqualifyingAnswer: q.disqualifyingAnswer ?? null,
                weight: q.weight ?? 5,
                sortOrder: q.sortOrder ?? index,
              }),
            ),
          );
        }
      }

      const refreshed = await jobRepo.findWizardDraft(draft.id, companyId);
      return refreshed as JobPosting;
    });
  }

  private applyScalarFields(draft: JobPosting, dto: UpdateJobWizardDto): void {
    if (dto.title !== undefined) draft.title = dto.title;
    if (dto.normalizedTitle !== undefined) draft.normalizedTitle = dto.normalizedTitle;
    if (dto.industry !== undefined) draft.industry = dto.industry;
    if (dto.department !== undefined) draft.department = dto.department;
    if (dto.seniorityLevel !== undefined) draft.seniorityLevel = dto.seniorityLevel;
    if (dto.location !== undefined) draft.location = dto.location;
    if (dto.province !== undefined) draft.province = dto.province;
    if (dto.employmentType !== undefined) {
      draft.employmentType = dto.employmentType as EmploymentType;
    }
    if (dto.workMode !== undefined) draft.workMode = dto.workMode as WorkMode;
    if (dto.companyContext !== undefined) draft.companyContext = dto.companyContext;
    if (dto.mainPurpose !== undefined) draft.mainPurpose = dto.mainPurpose;
    if (dto.description !== undefined) draft.description = dto.description;
    if (dto.requiredCertifications !== undefined) {
      draft.requiredCertifications = dto.requiredCertifications;
    }
    if (dto.minExperienceYears !== undefined) draft.minExperienceYears = dto.minExperienceYears;
    if (dto.requiredEducation !== undefined) draft.requiredEducation = dto.requiredEducation;
    if (dto.salaryMin !== undefined) draft.salaryMin = dto.salaryMin;
    if (dto.salaryMax !== undefined) draft.salaryMax = dto.salaryMax;
    if (dto.salaryCurrency !== undefined) draft.salaryCurrency = dto.salaryCurrency;
    if (dto.commissionStructure !== undefined) draft.commissionStructure = dto.commissionStructure;
    if (dto.benefits !== undefined) draft.benefits = dto.benefits;
    if (dto.enabledPortalCodes !== undefined) draft.enabledPortalCodes = dto.enabledPortalCodes;
    if (dto.responseTimelineDays !== undefined) {
      draft.responseTimelineDays = dto.responseTimelineDays;
    }
    if (dto.applyByEmail !== undefined) draft.applyByEmail = dto.applyByEmail;
  }

  /**
   * Phase 1 wizard: validate required fields and transition to ACTIVE,
   * then dispatch to the configured external portals.
   */
  async publishDraft(
    companyId: number,
    id: number,
    options: { testMode?: boolean } = {},
  ): Promise<JobPosting> {
    const draft = await this.findWizardDraft(companyId, id);

    if (draft.status === JobPostingStatus.ACTIVE) {
      return draft;
    }

    const validationIssues = this.validatePublishable(draft);
    if (validationIssues.length > 0) {
      throw new BadRequestException({
        message: "Job posting is not ready to publish",
        issues: validationIssues,
      });
    }

    draft.status = JobPostingStatus.ACTIVE;
    draft.testMode = Boolean(options.testMode);
    if (!draft.activatedAt) {
      draft.activatedAt = now().toJSDate();
    }
    const saved = await this.jobPostingRepo.save(draft);
    if (!saved.testMode) {
      this.distributeToPortals(saved);
    } else {
      this.logger.log(
        `Job posting ${saved.id} published in TEST MODE — skipping external portal distribution.`,
      );
    }
    return saved;
  }

  private validatePublishable(draft: JobPosting): string[] {
    const issues: string[] = [];
    const trimmedTitle = draft.title?.trim();
    if (!trimmedTitle || trimmedTitle === "Untitled draft") {
      issues.push("Job title is required");
    }
    if (!draft.description || draft.description.trim().length < 40) {
      issues.push("Description must be at least 40 characters");
    }
    if (!draft.location || !draft.province) {
      issues.push("Location (city + province) is required");
    }
    if (!draft.employmentType) {
      issues.push("Employment type is required");
    }
    return issues;
  }

  async create(companyId: number, dto: CreateJobPostingDto): Promise<JobPosting> {
    const referenceNumber = await this.allocateReferenceNumber();
    const jobPosting = await this.jobPostingRepo.create({
      ...dto,
      employmentType: (dto.employmentType ?? null) as EmploymentType | null,
      salaryCurrency: dto.salaryCurrency ?? "ZAR",
      responseTimelineDays: dto.responseTimelineDays ?? 14,
      enabledPortalCodes: dto.enabledPortalCodes ?? [],
      referenceNumber,
      companyId,
      status: JobPostingStatus.DRAFT,
    });
    return jobPosting;
  }

  async findAll(companyId: number, status?: string): Promise<JobPosting[]> {
    return this.jobPostingRepo.findByCompany(companyId, status);
  }

  async findById(companyId: number, id: number): Promise<JobPosting> {
    const jobPosting = await this.jobPostingRepo.findByIdForCompanyWithCandidates(id, companyId);
    if (!jobPosting) {
      throw new NotFoundException("Job posting not found");
    }
    return jobPosting;
  }

  async update(companyId: number, id: number, dto: UpdateJobPostingDto): Promise<JobPosting> {
    const jobPosting = await this.findById(companyId, id);

    if (dto.title != null) jobPosting.title = dto.title;
    if (dto.description != null) jobPosting.description = dto.description;
    if (dto.requiredSkills != null) jobPosting.requiredSkills = dto.requiredSkills;
    if (dto.minExperienceYears != null) jobPosting.minExperienceYears = dto.minExperienceYears;
    if (dto.requiredEducation != null) jobPosting.requiredEducation = dto.requiredEducation;
    if (dto.requiredCertifications != null)
      jobPosting.requiredCertifications = dto.requiredCertifications;
    if (dto.emailSubjectPattern != null) jobPosting.emailSubjectPattern = dto.emailSubjectPattern;
    if (dto.autoRejectEnabled != null) jobPosting.autoRejectEnabled = dto.autoRejectEnabled;
    if (dto.autoRejectThreshold != null) jobPosting.autoRejectThreshold = dto.autoRejectThreshold;
    if (dto.autoAcceptThreshold != null) jobPosting.autoAcceptThreshold = dto.autoAcceptThreshold;
    if (dto.responseTimelineDays != null)
      jobPosting.responseTimelineDays = dto.responseTimelineDays;
    if (dto.location != null) jobPosting.location = dto.location;
    if (dto.province != null) jobPosting.province = dto.province;
    if (dto.employmentType != null)
      jobPosting.employmentType = dto.employmentType as EmploymentType;
    if (dto.salaryMin != null) jobPosting.salaryMin = dto.salaryMin;
    if (dto.salaryMax != null) jobPosting.salaryMax = dto.salaryMax;
    if (dto.salaryCurrency != null) jobPosting.salaryCurrency = dto.salaryCurrency;
    if (dto.applyByEmail != null) jobPosting.applyByEmail = dto.applyByEmail;
    if (dto.enabledPortalCodes != null) jobPosting.enabledPortalCodes = dto.enabledPortalCodes;
    if (dto.status != null) {
      const newStatus = dto.status as JobPostingStatus;
      const wasActive = jobPosting.status === JobPostingStatus.ACTIVE;
      jobPosting.status = newStatus;
      if (newStatus === JobPostingStatus.ACTIVE && !wasActive && !jobPosting.activatedAt) {
        jobPosting.activatedAt = now().toJSDate();
      }
    }

    return this.jobPostingRepo.save(jobPosting);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const jobPosting = await this.findById(companyId, id);
    await this.jobPostingRepo.remove(jobPosting);
  }

  async activate(companyId: number, id: number): Promise<JobPosting> {
    const previous = await this.findById(companyId, id);
    const wasAlreadyActive = previous.status === JobPostingStatus.ACTIVE;
    const updated = await this.update(companyId, id, { status: JobPostingStatus.ACTIVE });
    if (!wasAlreadyActive) {
      this.distributeToPortals(updated);
    }
    return updated;
  }

  private distributeToPortals(jobPosting: JobPosting): void {
    const codes = jobPosting.enabledPortalCodes ?? [];
    const dispatch =
      codes.length > 0
        ? this.portalPostingOrchestrator.postToSelectedAdapters(jobPosting, codes)
        : this.portalPostingOrchestrator.postToFreeAdapters(jobPosting);

    void dispatch.catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Portal distribution for job posting ${jobPosting.id} failed: ${message}`);
    });
  }

  async pause(companyId: number, id: number): Promise<JobPosting> {
    return this.update(companyId, id, { status: JobPostingStatus.PAUSED });
  }

  async close(companyId: number, id: number): Promise<JobPosting> {
    return this.update(companyId, id, { status: JobPostingStatus.CLOSED });
  }

  async activeJobPostingsForCompany(companyId: number): Promise<JobPosting[]> {
    return this.jobPostingRepo.activeForCompany(companyId);
  }

  async listActiveForFeed(): Promise<PublicJobPostingDto[]> {
    const jobs = await this.jobPostingRepo.activeForFeed();
    if (jobs.length === 0) return [];

    const companyIds = Array.from(new Set(jobs.map((j) => j.companyId)));
    const companies = await this.companyRepo.findByIds(companyIds);
    const companyById = new Map(companies.map((c) => [c.id, c]));

    return jobs.map((job) => {
      const company = companyById.get(job.companyId);
      const refNumber = job.referenceNumber ? job.referenceNumber : `JOB-${job.id}`;
      return {
        referenceNumber: refNumber,
        title: job.title,
        description: job.description,
        location: job.location,
        province: job.province,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        requiredSkills: job.requiredSkills,
        requiredEducation: job.requiredEducation,
        requiredCertifications: job.requiredCertifications,
        minExperienceYears: job.minExperienceYears,
        responseTimelineDays: job.responseTimelineDays,
        applyByEmail: ANNIX_ORBIT_APPLICATIONS_INBOX,
        postedAt: job.activatedAt ? job.activatedAt : job.createdAt,
        companyName: company?.name ? company.name : null,
      };
    });
  }

  async publicByReferenceNumber(referenceNumber: string): Promise<PublicJobPostingDto | null> {
    const normalised = referenceNumber.trim().toUpperCase();
    const jobPosting = await this.jobPostingRepo.findActiveByReferenceNumber(normalised);
    if (!jobPosting) return null;

    const company = await this.companyRepo.findById(jobPosting.companyId);

    return {
      referenceNumber: jobPosting.referenceNumber ?? normalised,
      title: jobPosting.title,
      description: jobPosting.description,
      location: jobPosting.location,
      province: jobPosting.province,
      employmentType: jobPosting.employmentType,
      salaryMin: jobPosting.salaryMin,
      salaryMax: jobPosting.salaryMax,
      salaryCurrency: jobPosting.salaryCurrency,
      requiredSkills: jobPosting.requiredSkills,
      requiredEducation: jobPosting.requiredEducation,
      requiredCertifications: jobPosting.requiredCertifications,
      minExperienceYears: jobPosting.minExperienceYears,
      responseTimelineDays: jobPosting.responseTimelineDays,
      applyByEmail: ANNIX_ORBIT_APPLICATIONS_INBOX,
      postedAt: jobPosting.activatedAt ?? jobPosting.createdAt,
      companyName: company?.name ?? null,
    };
  }

  private async allocateReferenceNumber(): Promise<string> {
    const attempts = Array.from({ length: MAX_REF_ATTEMPTS });
    for (const _ of attempts) {
      const candidate = `JOB-${this.randomReferenceCore()}`;
      const existing = await this.jobPostingRepo.findByReferenceNumber(candidate);
      if (!existing) return candidate;
    }
    throw new ConflictException(
      "Unable to allocate a unique job reference number; please retry shortly.",
    );
  }

  private randomReferenceCore(): string {
    const chars = Array.from({ length: REF_LENGTH }, () => {
      const idx = Math.floor(Math.random() * REF_ALPHABET.length);
      return REF_ALPHABET[idx];
    });
    return chars.join("");
  }
}
