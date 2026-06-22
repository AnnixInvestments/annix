import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { JobCardImportJob } from "../entities/job-card-import-job.entity";
import { JobCardImportJobRepository } from "../repositories/job-card-import-job.repository";
import { type JobCardImportRow, JobCardImportService } from "./job-card-import.service";

@Injectable()
export class JobCardImportJobService implements OnModuleInit {
  private readonly logger = new Logger(JobCardImportJobService.name);

  constructor(
    private readonly importJobRepo: JobCardImportJobRepository,
    private readonly jobCardImportService: JobCardImportService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  async onModuleInit(): Promise<void> {
    const failed = await this.importJobRepo
      .markStaleProcessingFailed("Interrupted by a server restart — please re-upload to try again.")
      .catch(() => 0);
    if (failed > 0) {
      this.logger.warn(`Marked ${failed} interrupted import job(s) as failed on startup`);
    }
  }

  async createJob(
    companyId: number,
    createdByUserId: number | null,
    file: Express.Multer.File,
  ): Promise<JobCardImportJob> {
    const storagePath = `${StorageArea.STOCK_CONTROL}/job-card-imports/company-${companyId}`;
    const stored = await this.storageService.upload(file, storagePath).catch(() => null);

    const job = await this.importJobRepo.create({
      companyId,
      createdByUserId,
      fileName: file.originalname,
      status: "processing",
      totalDocuments: 0,
      completedDocuments: 0,
      drawingRows: [],
      qualityDocuments: [],
      sourceFilePath: stored ? stored.path : null,
      sourceFileName: file.originalname,
      acknowledged: false,
    });

    const buffer = file.buffer;
    const fileName = file.originalname;
    void this.processJob(job.id, companyId, buffer, fileName);

    return job;
  }

  private async processJob(
    jobId: number,
    companyId: number,
    buffer: Buffer,
    fileName: string,
  ): Promise<void> {
    try {
      const { drawings, qualityDocuments } = await this.jobCardImportService.splitEmlAttachments(
        buffer,
        fileName,
      );

      const job = await this.importJobRepo.findOneForCompany(jobId, companyId);
      if (!job) return;

      job.totalDocuments = drawings.length;
      job.qualityDocuments = qualityDocuments;
      await this.importJobRepo.saveForCompany(companyId, job);

      if (drawings.length === 0) {
        await this.failJob(jobId, companyId, "No drawing PDFs were found in this email.");
        return;
      }

      const collected: JobCardImportRow[] = [];
      let documentNumber: string | null = null;

      await drawings.reduce(
        (chain, drawing, index) =>
          chain.then(async () => {
            const inProgress = await this.importJobRepo.findOneForCompany(jobId, companyId);
            if (inProgress) {
              inProgress.currentDocumentName = drawing.filename;
              await this.importJobRepo.saveForCompany(companyId, inProgress);
            }

            const result = await this.jobCardImportService.parseDrawingPdfs([drawing]);
            const rows = result.drawingRows;
            const docNum = result.documentNumber;
            if (rows && rows.length > 0) collected.push(...rows);
            if (!documentNumber && docNum) documentNumber = docNum;

            const afterDoc = await this.importJobRepo.findOneForCompany(jobId, companyId);
            if (afterDoc) {
              afterDoc.completedDocuments = index + 1;
              afterDoc.drawingRows = collected as unknown as Record<string, unknown>[];
              afterDoc.documentNumber = documentNumber;
              await this.importJobRepo.saveForCompany(companyId, afterDoc);
            }
          }),
        Promise.resolve(),
      );

      const finalJob = await this.importJobRepo.findOneForCompany(jobId, companyId);
      if (!finalJob) return;
      if (collected.length === 0) {
        finalJob.status = "failed";
        finalJob.error = "Could not extract any job card data from the drawings in this email.";
      } else {
        finalJob.status = "completed";
        finalJob.currentDocumentName = null;
      }
      await this.importJobRepo.saveForCompany(companyId, finalJob);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Import job ${jobId} failed: ${message}`);
      await this.failJob(jobId, companyId, "Something went wrong while extracting the drawings.");
    }
  }

  private async failJob(jobId: number, companyId: number, error: string): Promise<void> {
    const job = await this.importJobRepo.findOneForCompany(jobId, companyId);
    if (!job) return;
    job.status = "failed";
    job.error = error;
    job.currentDocumentName = null;
    await this.importJobRepo.saveForCompany(companyId, job);
  }

  job(companyId: number, id: number): Promise<JobCardImportJob | null> {
    return this.importJobRepo.findOneForCompany(id, companyId);
  }

  activeJobs(companyId: number, createdByUserId: number | null): Promise<JobCardImportJob[]> {
    return this.importJobRepo.findActiveForUser(companyId, createdByUserId);
  }

  async acknowledge(companyId: number, id: number): Promise<void> {
    const job = await this.importJobRepo.findOneForCompany(id, companyId);
    if (!job) return;
    job.acknowledged = true;
    await this.importJobRepo.saveForCompany(companyId, job);
  }
}
