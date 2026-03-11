import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard, JobCardWorkflowStatus } from "../entities/job-card.entity";
import { JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { JobCardVersion } from "../entities/job-card-version.entity";

@Injectable()
export class JobCardVersionService {
  private readonly logger = new Logger(JobCardVersionService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardVersion)
    private readonly versionRepo: Repository<JobCardVersion>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @InjectRepository(JobCardApproval)
    private readonly approvalRepo: Repository<JobCardApproval>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async archiveCurrentVersion(
    companyId: number,
    jobCardId: number,
    amendmentNotes: string | null,
    createdBy: string | null,
  ): Promise<JobCardVersion> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["lineItems"],
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const lineItemsSnapshot =
      jobCard.lineItems?.map((li) => ({
        id: li.id,
        itemCode: li.itemCode,
        itemDescription: li.itemDescription,
        itemNo: li.itemNo,
        quantity: li.quantity,
        jtNo: li.jtNo,
        sortOrder: li.sortOrder,
        notes: li.notes,
        m2: li.m2,
      })) ?? [];

    const approvals = await this.approvalRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "ASC" },
    });

    const approvalsSnapshot = approvals.map((a) => ({
      step: a.step,
      status: a.status,
      approvedByName: a.approvedByName,
      approvedAt: a.approvedAt?.toISOString() ?? null,
      comments: a.comments,
      rejectedReason: a.rejectedReason,
    }));

    const version = this.versionRepo.create({
      jobCardId: jobCard.id,
      companyId,
      versionNumber: jobCard.versionNumber,
      filePath: jobCard.sourceFilePath,
      originalFilename: jobCard.sourceFileName,
      jobName: jobCard.jobName,
      customerName: jobCard.customerName,
      notes: jobCard.notes,
      lineItemsSnapshot,
      workflowStatus: jobCard.workflowStatus,
      approvalsSnapshot,
      amendmentNotes,
      createdBy,
    });

    const saved = await this.versionRepo.save(version);

    this.logger.log(
      `Archived v${jobCard.versionNumber} for job card ${jobCard.jobNumber}`,
    );

    return saved;
  }

  async resetWorkflow(companyId: number, jobCardId: number): Promise<void> {
    await this.approvalRepo.delete({ jobCardId, companyId });

    await this.jobCardRepo.update(
      { id: jobCardId, companyId },
      { workflowStatus: JobCardWorkflowStatus.DRAFT },
    );

    this.logger.log(`Reset workflow for job card ${jobCardId}`);
  }

  async createAmendment(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    notes: string | null,
    createdBy: string | null,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    await this.archiveCurrentVersion(companyId, jobCardId, notes, createdBy);

    const uploadResult = await this.storageService.upload(
      file,
      "stock-control/job-card-amendments",
    );

    jobCard.versionNumber = jobCard.versionNumber + 1;
    jobCard.sourceFilePath = uploadResult.url;
    jobCard.sourceFileName = file.originalname;

    await this.jobCardRepo.save(jobCard);

    await this.resetWorkflow(companyId, jobCardId);

    this.logger.log(
      `Created amendment v${jobCard.versionNumber} for job card ${jobCard.jobNumber}`,
    );

    return jobCard;
  }

  async versionHistory(companyId: number, jobCardId: number): Promise<JobCardVersion[]> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    return this.versionRepo.find({
      where: { jobCardId, companyId },
      order: { versionNumber: "DESC" },
    });
  }

  async versionById(
    companyId: number,
    jobCardId: number,
    versionId: number,
  ): Promise<JobCardVersion> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, jobCardId, companyId },
    });

    if (!version) {
      throw new NotFoundException("Version not found");
    }

    return version;
  }
}
