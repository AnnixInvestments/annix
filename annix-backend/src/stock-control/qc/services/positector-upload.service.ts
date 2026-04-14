import { createHash } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, IsNull, Repository } from "typeorm";
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
export class PositectorUploadService implements OnModuleInit {
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

  async onModuleInit() {
    setTimeout(() => {
      this.fixAllBundleBatchNames().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Auto-fix bundle batch names failed: ${msg}`);
      });
      this.backfillMissingMeasurementDates().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Auto-backfill measurement dates failed: ${msg}`);
      });
    }, 10000);
  }

  private async backfillMissingMeasurementDates(): Promise<void> {
    const pending = await this.uploadRepo
      .createQueryBuilder("u")
      .where("u.measurementDate IS NULL")
      .getMany();

    if (pending.length === 0) return;

    this.logger.log(`Backfilling measurement_date for ${pending.length} uploads...`);
    const datePattern = /(\d{4}-\d{2}-\d{2})/;
    let updated = 0;

    for (const upload of pending) {
      try {
        const fromHeader = this.extractMeasurementDate(upload.headerData);
        if (fromHeader) {
          await this.uploadRepo.update(upload.id, { measurementDate: fromHeader });
          updated++;
          continue;
        }
        const buffer = await this.storageService.download(upload.s3FilePath);
        const pdfParseModule = require("pdf-parse");
        const pdfParse = pdfParseModule.default ?? pdfParseModule;
        const pdfData = await pdfParse(buffer);
        const text: string = pdfData.text;
        const match = text.match(datePattern);
        if (match) {
          await this.uploadRepo.update(upload.id, { measurementDate: match[1] });
          updated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to backfill measurement_date for upload ${upload.id}: ${msg}`);
      }
    }

    this.logger.log(`Backfilled measurement_date for ${updated}/${pending.length} uploads`);
  }

  private async fixAllBundleBatchNames(): Promise<void> {
    const bundleUploads = await this.uploadRepo
      .createQueryBuilder("u")
      .where("u.batchName LIKE :prefix", { prefix: "bundle_%" })
      .getMany();

    if (bundleUploads.length === 0) return;

    this.logger.log(`Fixing ${bundleUploads.length} bundle upload batch names...`);
    const batchPattern = /\b(B\d+)\b/;
    let updated = 0;

    for (const upload of bundleUploads) {
      try {
        const buffer = await this.storageService.download(upload.s3FilePath);
        const pdfParseModule = require("pdf-parse");
        const pdfParse = pdfParseModule.default ?? pdfParseModule;
        const pdfData = await pdfParse(buffer);
        const text: string = pdfData.text;
        const match = text.match(batchPattern);
        if (match) {
          await this.uploadRepo.update(upload.id, { batchName: match[1] });
          updated++;
        }
      } catch {
        this.logger.warn(`Failed to fix batch name for upload ${upload.id}`);
      }
    }

    this.logger.log(`Fixed ${updated}/${bundleUploads.length} bundle batch names`);
  }

  async uploadsForJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]> {
    return this.uploadRepo.find({
      where: { companyId, linkedJobCardId: jobCardId },
      order: { createdAt: "DESC" },
    });
  }

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
      measurementDate: this.extractMeasurementDate(batch.header.raw),
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

  async fixBundleBatchNames(companyId: number): Promise<{ updated: number; total: number }> {
    const bundleUploads = await this.uploadRepo
      .createQueryBuilder("u")
      .where("u.companyId = :companyId", { companyId })
      .andWhere("u.batchName LIKE :prefix", { prefix: "bundle_%" })
      .getMany();

    const BATCH_PATTERN = /\b(B\d+)\b/;
    let updated = 0;

    for (const upload of bundleUploads) {
      try {
        const buffer = await this.storageService.download(upload.s3FilePath);
        const pdfParseModule = require("pdf-parse");
        const pdfParse = pdfParseModule.default ?? pdfParseModule;
        const pdfData = await pdfParse(buffer);
        const text: string = pdfData.text;
        const match = text.match(BATCH_PATTERN);
        if (match) {
          const batchName = match[1];
          await this.uploadRepo.update(upload.id, { batchName });
          this.logger.log(`Fixed upload ${upload.id}: "${upload.batchName}" → "${batchName}"`);
          updated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to fix batch name for upload ${upload.id}: ${msg}`);
      }
    }

    return { updated, total: bundleUploads.length };
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

    await this.linkUploadToBatchAssignments(companyId, upload);

    return { ...result, uploadId: upload.id };
  }

  private async linkUploadToBatchAssignments(
    companyId: number,
    upload: PositectorUpload,
  ): Promise<void> {
    if (!upload.linkedJobCardId || !upload.batchName) return;

    const { QcBatchAssignment } = await import("../entities/qc-batch-assignment.entity");
    const assignmentRepo = this.uploadRepo.manager.getRepository(QcBatchAssignment);

    await assignmentRepo
      .createQueryBuilder()
      .update(QcBatchAssignment)
      .set({ positectorUploadId: upload.id })
      .where("companyId = :companyId", { companyId })
      .andWhere("jobCardId = :jobCardId", { jobCardId: upload.linkedJobCardId })
      .andWhere("LOWER(batchNumber) = LOWER(:batchNumber)", { batchNumber: upload.batchName })
      .andWhere("positectorUploadId IS NULL")
      .execute();
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

  async autoLinkEnvironmentalByDateRange(
    companyId: number,
    jobCardId: number,
    earliestDate: string,
    latestDate: string,
    user: UserContext,
  ): Promise<number> {
    const candidates = await this.uploadRepo.find({
      where: {
        companyId,
        entityType: "environmental",
        linkedJobCardId: IsNull(),
        measurementDate: Between(earliestDate, latestDate),
      },
    });

    if (candidates.length === 0) return 0;

    let linked = 0;
    for (const upload of candidates) {
      try {
        await this.linkAndImport(companyId, upload.id, jobCardId, {}, user);
        linked++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Auto-link env upload ${upload.id} (date=${upload.measurementDate}) to JC ${jobCardId} failed: ${msg}`,
        );
      }
    }
    if (linked > 0) {
      this.logger.log(`Auto-linked ${linked} environmental upload(s) to JC ${jobCardId}`);
    }
    return linked;
  }

  private extractMeasurementDate(raw: Record<string, string> | null | undefined): string | null {
    if (!raw) return null;
    const candidates = [raw.Created, raw.created, raw.Date, raw.date];
    for (const value of candidates) {
      if (!value || typeof value !== "string") continue;
      const match = value.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    return null;
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
