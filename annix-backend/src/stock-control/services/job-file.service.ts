import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";

const FILE_NAMING_SYSTEM_PROMPT =
  "You are a document classification assistant. Given a filename and MIME type, provide a short descriptive name (max 80 chars) that describes the document's purpose. For example: 'Material Test Certificate - Grade 350WA Steel Plate'. Return ONLY the name, nothing else.";

@Injectable()
export class JobFileService {
  private readonly logger = new Logger(JobFileService.name);

  constructor(
    @InjectRepository(JobCardJobFile)
    private readonly jobFileRepo: Repository<JobCardJobFile>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async filesForJobCard(companyId: number, jobCardId: number): Promise<JobCardJobFile[]> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const files = await this.jobFileRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const normalizedPath = this.normalizeStoragePath(file.filePath);
        const signedUrl = await this.storageService.presignedUrl(normalizedPath, 3600);
        return { ...file, filePath: signedUrl };
      }),
    );

    return filesWithUrls;
  }

  async uploadFile(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    uploadedById: number | null,
    uploadedByName: string | null,
  ): Promise<JobCardJobFile> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const uploadResult = await this.storageService.upload(
      file,
      `stock-control/job-files/${jobCardId}`,
    );

    const extension = file.originalname.split(".").pop() || "";

    const jobFile = this.jobFileRepo.create({
      jobCardId,
      companyId,
      filePath: uploadResult.path,
      originalFilename: file.originalname,
      aiGeneratedName: null,
      fileType: extension.toLowerCase(),
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedById,
      uploadedByName,
    });

    const saved = await this.jobFileRepo.save(jobFile);
    this.logger.log(`Uploaded job file ${saved.id} for job card ${jobCardId}`);

    this.analyzeAndNameFile(saved.id).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI naming failed for job file ${saved.id}: ${message}`);
    });

    const signedUrl = await this.storageService.presignedUrl(saved.filePath, 3600);
    return { ...saved, filePath: signedUrl };
  }

  async deleteFile(
    companyId: number,
    jobCardId: number,
    fileId: number,
    userId: number | null,
  ): Promise<void> {
    const file = await this.jobFileRepo.findOne({
      where: { id: fileId, jobCardId, companyId },
    });

    if (!file) {
      throw new NotFoundException("Job file not found");
    }

    if (userId !== null && file.uploadedById !== null && file.uploadedById !== userId) {
      throw new ForbiddenException("Only the uploader can delete this file");
    }

    await this.jobFileRepo.remove(file);
    this.logger.log(`Deleted job file ${fileId} from job card ${jobCardId}`);
  }

  async presignedUrlForFile(
    companyId: number,
    jobCardId: number,
    fileId: number,
  ): Promise<{ url: string }> {
    const file = await this.jobFileRepo.findOne({
      where: { id: fileId, jobCardId, companyId },
    });

    if (!file) {
      throw new NotFoundException("Job file not found");
    }

    const normalizedPath = this.normalizeStoragePath(file.filePath);
    const url = await this.storageService.presignedUrl(normalizedPath, 3600);
    return { url };
  }

  async hasImageFiles(companyId: number, jobCardId: number): Promise<boolean> {
    const count = await this.jobFileRepo.count({
      where: [
        { jobCardId, companyId, mimeType: "image/jpeg" },
        { jobCardId, companyId, mimeType: "image/png" },
        { jobCardId, companyId, mimeType: "image/jpg" },
      ],
    });
    return count > 0;
  }

  private async analyzeAndNameFile(fileId: number): Promise<void> {
    const file = await this.jobFileRepo.findOne({ where: { id: fileId } });

    if (!file) {
      return;
    }

    try {
      const prompt = `Filename: "${file.originalFilename}"\nMIME type: ${file.mimeType}\n\nProvide a short descriptive name (max 80 chars) that describes this document's purpose. Return ONLY the name, nothing else.`;

      const messages: ChatMessage[] = [{ role: "user", content: prompt }];
      const { content: aiName } = await this.aiChatService.chat(
        messages,
        FILE_NAMING_SYSTEM_PROMPT,
      );

      const trimmedName = aiName.trim().substring(0, 80);
      await this.jobFileRepo.update(fileId, { aiGeneratedName: trimmedName });
      this.logger.log(`AI named job file ${fileId}: "${trimmedName}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`AI naming failed for job file ${fileId}: ${message}`);
    }
  }

  private normalizeStoragePath(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      const urlWithoutQuery = pathOrUrl.split("?")[0];
      return urlWithoutQuery.replace(/^https?:\/\/[^/]+\//, "");
    }
    return pathOrUrl;
  }
}
