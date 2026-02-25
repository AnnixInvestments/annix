import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
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
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async createAmendment(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    notes: string | null,
    createdBy: string | null,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["lineItems"],
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const lineItemsSnapshot = jobCard.lineItems?.map((li) => ({
      id: li.id,
      itemCode: li.itemCode,
      itemDescription: li.itemDescription,
      itemNo: li.itemNo,
      quantity: li.quantity,
      jtNo: li.jtNo,
      sortOrder: li.sortOrder,
    })) ?? [];

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
      amendmentNotes: notes,
      createdBy,
    });
    await this.versionRepo.save(version);

    const uploadResult = await this.storageService.upload(file, "stock-control/job-card-amendments");

    jobCard.versionNumber = jobCard.versionNumber + 1;
    jobCard.sourceFilePath = uploadResult.url;
    jobCard.sourceFileName = file.originalname;

    await this.jobCardRepo.save(jobCard);

    this.logger.log(`Created amendment v${jobCard.versionNumber} for job card ${jobCard.jobNumber}`);

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

  async versionById(companyId: number, jobCardId: number, versionId: number): Promise<JobCardVersion> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, jobCardId, companyId },
    });

    if (!version) {
      throw new NotFoundException("Version not found");
    }

    return version;
  }
}
