import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { nowISO } from "../../../lib/datetime";
import type { IStorageService } from "../../../storage/storage.interface";
import { STORAGE_SERVICE, StorageArea } from "../../../storage/storage.interface";
import { JobCardCoatingAnalysis } from "../../entities/coating-analysis.entity";
import { JobCard } from "../../entities/job-card.entity";
import { PositectorUpload } from "../entities/positector-upload.entity";
import { DftCoatType } from "../entities/qc-dft-reading.entity";
import type { PositectorBatch } from "./positector.service";
import type { ImportResult } from "./positector-import.service";
import { PositectorImportService } from "./positector-import.service";

interface UserContext {
  id?: number;
  name: string;
  companyId: number;
}

@Injectable()
export class PositectorUploadService {
  private readonly logger = new Logger(PositectorUploadService.name);

  constructor(
    @InjectRepository(PositectorUpload)
    private readonly uploadRepo: Repository<PositectorUpload>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingRepo: Repository<JobCardCoatingAnalysis>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly importService: PositectorImportService,
  ) {}

  async storeUpload(
    companyId: number,
    file: Express.Multer.File,
    batch: PositectorBatch,
    entityType: string,
    detectedFormat: string | null,
    user: UserContext,
  ): Promise<PositectorUpload> {
    const timestamp = nowISO().replace(/[:.]/g, "-");
    const safeName = (file.originalname || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const subPath = `${StorageArea.STOCK_CONTROL}/positector-uploads/${companyId}/${timestamp}_${safeName}`;

    const storageResult = await this.storageService.upload(file, subPath);

    const readingsData = batch.readings.map((r) => ({
      index: r.index,
      value: r.value,
      units: r.units,
      raw: r.raw,
    }));

    const fingerprint = this.computeFingerprint(
      batch.header.batchName || null,
      batch.header.probeType || null,
      batch.readings.length,
      batch.readings,
      batch.header.raw,
    );

    const existing = await this.uploadRepo.findOne({
      where: { companyId, fingerprint },
    });

    if (existing) {
      this.logger.log(
        `Duplicate upload detected (batch=${existing.batchName}, id=${existing.id}), updating S3 path`,
      );
      existing.s3FilePath = storageResult.path;
      existing.originalFilename = file.originalname;
      existing.uploadedByName = user.name;
      existing.uploadedById = user.id ?? null;
      return this.uploadRepo.save(existing);
    }

    const upload = this.uploadRepo.create({
      companyId,
      originalFilename: file.originalname,
      s3FilePath: storageResult.path,
      batchName: batch.header.batchName || null,
      probeType: batch.header.probeType || null,
      entityType,
      detectedFormat,
      headerData: batch.header.raw,
      readingsData,
      statisticsData: batch.statistics || null,
      readingCount: batch.readings.length,
      linkedJobCardId: null,
      importRecordId: null,
      importedAt: null,
      uploadedByName: user.name,
      uploadedById: user.id ?? null,
      fingerprint,
    });

    return this.uploadRepo.save(upload);
  }

  async allUploads(companyId: number): Promise<PositectorUpload[]> {
    return this.uploadRepo.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
  }

  async uploadById(companyId: number, id: number): Promise<PositectorUpload | null> {
    return this.uploadRepo.findOne({ where: { companyId, id } });
  }

  async unlinkedUploads(companyId: number, entityType?: string): Promise<PositectorUpload[]> {
    const qb = this.uploadRepo
      .createQueryBuilder("u")
      .where("u.companyId = :companyId", { companyId })
      .andWhere("u.linkedJobCardId IS NULL")
      .orderBy("u.createdAt", "DESC");

    if (entityType) {
      qb.andWhere("u.entityType = :entityType", { entityType });
    }

    return qb.getMany();
  }

  async presignedDownloadUrl(upload: PositectorUpload): Promise<string> {
    return this.storageService.presignedUrl(upload.s3FilePath, 3600);
  }

  async linkAndImport(
    companyId: number,
    uploadId: number,
    jobCardId: number,
    options: {
      coatType?: string;
      paintProduct?: string;
      specMinMicrons?: number;
      specMaxMicrons?: number;
      specMicrons?: number;
      rubberSpec?: string;
      rubberBatchNumber?: string | null;
      requiredShore?: number;
    },
    user: UserContext,
  ): Promise<ImportResult & { uploadId: number }> {
    const upload = await this.uploadRepo.findOne({ where: { companyId, id: uploadId } });
    if (!upload) {
      throw new Error(`PosiTector upload ${uploadId} not found`);
    }

    const batch = this.reconstructBatch(upload);
    let result: ImportResult;

    if (upload.entityType === "dft") {
      result = await this.importService.importDftReadings(
        companyId,
        batch,
        {
          jobCardId,
          coatType: options.coatType === "final" ? DftCoatType.FINAL : DftCoatType.PRIMER,
          paintProduct: options.paintProduct || "Unknown",
          batchNumber: upload.batchName || null,
          specMinMicrons: options.specMinMicrons || 0,
          specMaxMicrons: options.specMaxMicrons || 0,
        },
        user,
      );
    } else if (upload.entityType === "blast_profile") {
      result = await this.importService.importBlastProfile(
        companyId,
        batch,
        {
          jobCardId,
          specMicrons: options.specMicrons || 0,
          temperature: null,
          humidity: null,
        },
        user,
      );
    } else if (upload.entityType === "shore_hardness") {
      result = await this.importService.importShoreHardness(
        companyId,
        batch,
        {
          jobCardId,
          rubberSpec: options.rubberSpec || "Unknown",
          rubberBatchNumber: options.rubberBatchNumber ?? upload.batchName ?? null,
          requiredShore: options.requiredShore || 0,
        },
        user,
      );
    } else if (upload.entityType === "environmental") {
      result = await this.importService.importEnvironmental(companyId, batch, { jobCardId }, user);
    } else {
      throw new Error(`Unsupported entity type: ${upload.entityType}`);
    }

    upload.linkedJobCardId = jobCardId;
    upload.importRecordId = result.recordId;
    upload.importedAt = new Date();
    await this.uploadRepo.save(upload);

    return { ...result, uploadId: upload.id };
  }

  async retroactiveMatch(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
    fieldKey: string,
    user: UserContext,
  ): Promise<Array<ImportResult & { uploadId: number }>> {
    const unlinked = await this.uploadRepo
      .createQueryBuilder("u")
      .where("u.companyId = :companyId", { companyId })
      .andWhere("u.linkedJobCardId IS NULL")
      .andWhere("LOWER(u.batchName) = LOWER(:batchNumber)", { batchNumber })
      .getMany();

    if (unlinked.length === 0) return [];

    const entityType = this.entityTypeFromFieldKey(fieldKey);
    const coatDetail = await this.coatDetailForFieldKey(companyId, jobCardId, fieldKey);

    const results: Array<ImportResult & { uploadId: number }> = [];

    for (const upload of unlinked) {
      if (entityType !== "unknown" && upload.entityType !== entityType) {
        this.logger.warn(
          `Upload ${upload.id} entity type ${upload.entityType} does not match field key ${fieldKey} (${entityType}), skipping`,
        );
        continue;
      }

      try {
        const importResult = await this.linkAndImport(
          companyId,
          upload.id,
          jobCardId,
          {
            coatType: coatDetail?.coatRole || undefined,
            paintProduct: coatDetail?.product || undefined,
            specMinMicrons: coatDetail?.minDftUm || undefined,
            specMaxMicrons: coatDetail?.maxDftUm || undefined,
          },
          user,
        );
        results.push(importResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to retroactively import upload ${upload.id}: ${message}`);
      }
    }

    return results;
  }

  private computeFingerprint(
    batchName: string | null,
    probeType: string | null,
    readingCount: number,
    readings: Array<{ value: number }>,
    headerRaw: Record<string, string>,
  ): string {
    const createdDate = headerRaw?.Created || headerRaw?.created || "";
    const first3 = readings.slice(0, 3).map((r) => r.value);
    const last3 = readings.slice(-3).map((r) => r.value);
    const payload = [
      batchName ?? "",
      probeType ?? "",
      createdDate,
      String(readingCount),
      ...first3.map(String),
      ...last3.map(String),
    ].join("|");
    return createHash("sha256").update(payload).digest("hex");
  }

  private reconstructBatch(upload: PositectorUpload): PositectorBatch {
    return {
      buid: `upload-${upload.id}`,
      header: {
        serialNumber: null,
        probeType: upload.probeType,
        batchName: upload.batchName,
        model: null,
        units: null,
        readingCount: upload.readingCount,
        raw: upload.headerData,
      },
      readings: upload.readingsData.map((r) => ({
        index: r.index,
        value: r.value,
        units: r.units,
        timestamp: null,
        raw: r.raw,
      })),
      statistics: upload.statisticsData || null,
    };
  }

  private entityTypeFromFieldKey(
    fieldKey: string,
  ): "dft" | "blast_profile" | "shore_hardness" | "environmental" | "unknown" {
    if (fieldKey.startsWith("paint_dft_")) return "dft";
    if (fieldKey === "paint_blast_profile" || fieldKey === "rubber_blast_profile")
      return "blast_profile";
    if (fieldKey === "rubber_shore_hardness") return "shore_hardness";
    return "unknown";
  }

  private async coatDetailForFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<{
    product: string;
    minDftUm: number;
    maxDftUm: number;
    coatRole: string | null;
  } | null> {
    if (!fieldKey.startsWith("paint_dft_")) return null;

    const coatIndexStr = fieldKey.replace("paint_dft_", "");
    const coatIndex = parseInt(coatIndexStr, 10);
    if (Number.isNaN(coatIndex)) return null;

    const analysis = await this.coatingRepo.findOne({
      where: { companyId, jobCardId },
    });
    if (!analysis) return null;

    const coats = (analysis as any).coats || [];
    const coat = coats[coatIndex];
    if (!coat) return null;

    return {
      product: coat.product || "Unknown",
      minDftUm: coat.minDftUm || 0,
      maxDftUm: coat.maxDftUm || 0,
      coatRole: coat.coatRole || null,
    };
  }
}
