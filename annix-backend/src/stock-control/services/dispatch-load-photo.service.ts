import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";

@Injectable()
export class DispatchLoadPhotoService {
  private readonly logger = new Logger(DispatchLoadPhotoService.name);

  constructor(
    @InjectRepository(DispatchLoadPhoto)
    private readonly photoRepo: Repository<DispatchLoadPhoto>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardJobFile)
    private readonly jobFileRepo: Repository<JobCardJobFile>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async uploadPhoto(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    user: { id: number; name: string },
    caption: string | null = null,
  ): Promise<DispatchLoadPhoto> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const storagePath = `${StorageArea.STOCK_CONTROL}/dispatch-load-photos/company-${companyId}/jc-${jobCardId}`;
    const stored = await this.storageService.upload(file, storagePath);

    const photo = this.photoRepo.create({
      jobCardId,
      companyId,
      filePath: stored.path,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      caption,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.photoRepo.save(photo);

    this.storeInJobFile(companyId, jobCardId, file, stored.path, user).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Failed to store load photo in job file: ${message}`);
    });

    const url = await this.storageService.presignedUrl(saved.filePath, 3600);
    return { ...saved, filePath: url };
  }

  async photosForJobCard(companyId: number, jobCardId: number): Promise<DispatchLoadPhoto[]> {
    const photos = await this.photoRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });

    return Promise.all(
      photos.map(async (photo) => {
        const url = await this.storageService.presignedUrl(photo.filePath, 3600);
        return { ...photo, filePath: url };
      }),
    );
  }

  async deletePhoto(companyId: number, photoId: number): Promise<void> {
    const photo = await this.photoRepo.findOne({
      where: { id: photoId, companyId },
    });

    if (!photo) {
      throw new NotFoundException(`Load photo ${photoId} not found`);
    }

    await this.photoRepo.remove(photo);
  }

  async hasPhotos(companyId: number, jobCardId: number): Promise<boolean> {
    const count = await this.photoRepo.count({
      where: { jobCardId, companyId },
    });
    return count > 0;
  }

  private async storeInJobFile(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    filePath: string,
    user: { id: number; name: string },
  ): Promise<void> {
    const extension = file.originalname.split(".").pop() || "";
    const jobFile = this.jobFileRepo.create({
      jobCardId,
      companyId,
      filePath,
      originalFilename: file.originalname,
      aiGeneratedName: `Dispatch Load Photo - ${file.originalname}`,
      fileType: extension.toLowerCase(),
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedById: user.id,
      uploadedByName: user.name,
    });
    await this.jobFileRepo.save(jobFile);
  }
}
