import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateJobPostingDto, UpdateJobPostingDto } from "../dto/job-posting.dto";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";

@Injectable()
export class JobPostingService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
  ) {}

  async create(companyId: number, dto: CreateJobPostingDto): Promise<JobPosting> {
    const jobPosting = this.jobPostingRepo.create({
      ...dto,
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

    if (dto.title !== undefined) jobPosting.title = dto.title;
    if (dto.description !== undefined) jobPosting.description = dto.description;
    if (dto.requiredSkills !== undefined) jobPosting.requiredSkills = dto.requiredSkills;
    if (dto.minExperienceYears !== undefined)
      jobPosting.minExperienceYears = dto.minExperienceYears;
    if (dto.requiredEducation !== undefined) jobPosting.requiredEducation = dto.requiredEducation;
    if (dto.requiredCertifications !== undefined)
      jobPosting.requiredCertifications = dto.requiredCertifications;
    if (dto.emailSubjectPattern !== undefined)
      jobPosting.emailSubjectPattern = dto.emailSubjectPattern;
    if (dto.autoRejectEnabled !== undefined) jobPosting.autoRejectEnabled = dto.autoRejectEnabled;
    if (dto.autoRejectThreshold !== undefined)
      jobPosting.autoRejectThreshold = dto.autoRejectThreshold;
    if (dto.autoAcceptThreshold !== undefined)
      jobPosting.autoAcceptThreshold = dto.autoAcceptThreshold;
    if (dto.status !== undefined) jobPosting.status = dto.status as JobPostingStatus;

    return this.jobPostingRepo.save(jobPosting);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const jobPosting = await this.findById(companyId, id);
    await this.jobPostingRepo.remove(jobPosting);
  }

  async activate(companyId: number, id: number): Promise<JobPosting> {
    return this.update(companyId, id, { status: JobPostingStatus.ACTIVE });
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
}
