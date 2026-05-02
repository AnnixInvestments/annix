import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { Company } from "../../platform/entities/company.entity";
import { CreateJobPostingDto, UpdateJobPostingDto } from "../dto/job-posting.dto";
import { EmploymentType, JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { PortalPostingOrchestrator } from "./portal-posting-orchestrator.service";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REF_LENGTH = 6;
const MAX_REF_ATTEMPTS = 8;

export const CV_ASSISTANT_APPLICATIONS_INBOX = "jobs@annix.co.za";

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
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly portalPostingOrchestrator: PortalPostingOrchestrator,
  ) {}

  async create(companyId: number, dto: CreateJobPostingDto): Promise<JobPosting> {
    const referenceNumber = await this.allocateReferenceNumber();
    const jobPosting = this.jobPostingRepo.create({
      ...dto,
      employmentType: (dto.employmentType ?? null) as EmploymentType | null,
      salaryCurrency: dto.salaryCurrency ?? "ZAR",
      responseTimelineDays: dto.responseTimelineDays ?? 14,
      enabledPortalCodes: dto.enabledPortalCodes ?? [],
      referenceNumber,
      companyId,
      status: JobPostingStatus.DRAFT,
    });
    return this.jobPostingRepo.save(jobPosting);
  }

  async findAll(companyId: number, status?: string): Promise<JobPosting[]> {
    const query: Record<string, unknown> = { companyId };
    if (status) {
      query.status = status;
    }
    return this.jobPostingRepo.find({
      where: query,
      order: { createdAt: "DESC" },
    });
  }

  async findById(companyId: number, id: number): Promise<JobPosting> {
    const jobPosting = await this.jobPostingRepo.findOne({
      where: { id, companyId },
      relations: ["candidates"],
    });
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
    return this.jobPostingRepo.find({
      where: { companyId, status: JobPostingStatus.ACTIVE },
    });
  }

  async publicByReferenceNumber(referenceNumber: string): Promise<PublicJobPostingDto | null> {
    const normalised = referenceNumber.trim().toUpperCase();
    const jobPosting = await this.jobPostingRepo.findOne({
      where: { referenceNumber: normalised, status: JobPostingStatus.ACTIVE },
    });
    if (!jobPosting) return null;

    const company = await this.companyRepo.findOne({ where: { id: jobPosting.companyId } });

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
      applyByEmail: CV_ASSISTANT_APPLICATIONS_INBOX,
      postedAt: jobPosting.activatedAt ?? jobPosting.createdAt,
      companyName: company?.name ?? null,
    };
  }

  private async allocateReferenceNumber(): Promise<string> {
    const attempts = Array.from({ length: MAX_REF_ATTEMPTS });
    for (const _ of attempts) {
      const candidate = `JOB-${this.randomReferenceCore()}`;
      const existing = await this.jobPostingRepo.findOne({
        where: { referenceNumber: candidate },
      });
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
