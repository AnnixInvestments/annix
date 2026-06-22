import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard, WORKFLOW_STATUS_DRAFT } from "../entities/job-card.entity";
import { JobCardVersion } from "../entities/job-card-version.entity";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardApprovalRepository } from "../repositories/job-card-approval.repository";
import { JobCardVersionRepository } from "../repositories/job-card-version.repository";

@Injectable()
export class JobCardVersionService {
  private readonly logger = new Logger(JobCardVersionService.name);

  constructor(
    private readonly jobCardRepo: JobCardRepository,
    private readonly versionRepo: JobCardVersionRepository,
    private readonly approvalRepo: JobCardApprovalRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async archiveCurrentVersion(
    companyId: number,
    jobCardId: number,
    amendmentNotes: string | null,
    createdBy: string | null,
  ): Promise<JobCardVersion> {
    const jobCard = await this.jobCardRepo.findOneForCompanyWithLineItems(jobCardId, companyId);

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

    const approvals = await this.approvalRepo.findForJobCardOrdered(companyId, jobCardId);

    const approvalsSnapshot = approvals.map((a) => ({
      step: a.step,
      status: a.status,
      approvedByName: a.approvedByName,
      approvedAt: a.approvedAt?.toISOString() ?? null,
      comments: a.comments,
      rejectedReason: a.rejectedReason,
    }));

    const saved = await this.versionRepo.create({
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

    this.logger.log(`Archived v${jobCard.versionNumber} for job card ${jobCard.jobNumber}`);

    return saved;
  }

  async resetWorkflow(companyId: number, jobCardId: number): Promise<void> {
    await this.approvalRepo.deleteForJobCard(companyId, jobCardId);

    await this.jobCardRepo.updateForCompany(jobCardId, companyId, {
      workflowStatus: WORKFLOW_STATUS_DRAFT,
    });

    this.logger.log(`Reset workflow for job card ${jobCardId}`);
  }

  async createAmendment(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    notes: string | null,
    createdBy: string | null,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

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

    await this.jobCardRepo.saveForCompany(companyId, jobCard);

    await this.resetWorkflow(companyId, jobCardId);

    this.logger.log(
      `Created amendment v${jobCard.versionNumber} for job card ${jobCard.jobNumber}`,
    );

    return jobCard;
  }

  async versionHistory(companyId: number, jobCardId: number): Promise<JobCardVersion[]> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    return this.versionRepo.findForJobCardOrdered(jobCardId, companyId);
  }

  async versionById(
    companyId: number,
    jobCardId: number,
    versionId: number,
  ): Promise<JobCardVersion> {
    const version = await this.versionRepo.findOneForJobCard(versionId, jobCardId, companyId);

    if (!version) {
      throw new NotFoundException("Version not found");
    }

    return version;
  }
}
