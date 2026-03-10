import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { nowISO } from "../../../lib/datetime";
import type { BlastProfileReadingEntry } from "../entities/qc-blast-profile.entity";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import type { DftReadingEntry } from "../entities/qc-dft-reading.entity";
import { DftCoatType, QcDftReading } from "../entities/qc-dft-reading.entity";
import type {
  ShoreHardnessAverages,
  ShoreHardnessReadings,
} from "../entities/qc-shore-hardness.entity";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";
import type { PositectorBatch, PositectorReading } from "./positector.service";

export interface ImportDftOptions {
  jobCardId: number;
  coatType: DftCoatType;
  paintProduct: string;
  batchNumber: string | null;
  specMinMicrons: number;
  specMaxMicrons: number;
}

export interface ImportBlastProfileOptions {
  jobCardId: number;
  specMicrons: number;
  temperature: number | null;
  humidity: number | null;
}

export interface ImportShoreHardnessOptions {
  jobCardId: number;
  rubberSpec: string;
  rubberBatchNumber: string | null;
  requiredShore: number;
}

export interface ImportResult {
  entityType: string;
  recordId: number;
  readingsImported: number;
  average: number | null;
  duplicateWarning: boolean;
}

@Injectable()
export class PositectorImportService {
  private readonly logger = new Logger(PositectorImportService.name);

  constructor(
    @InjectRepository(QcDftReading)
    private readonly dftRepo: Repository<QcDftReading>,
    @InjectRepository(QcBlastProfile)
    private readonly blastRepo: Repository<QcBlastProfile>,
    @InjectRepository(QcShoreHardness)
    private readonly shoreRepo: Repository<QcShoreHardness>,
  ) {}

  async importDftReadings(
    companyId: number,
    batch: PositectorBatch,
    options: ImportDftOptions,
    user: { id?: number; name: string },
  ): Promise<ImportResult> {
    const readings: DftReadingEntry[] = batch.readings.map((r) => ({
      itemNumber: r.index,
      reading: r.value,
    }));

    if (readings.length === 0) {
      throw new BadRequestException("Batch contains no readings to import");
    }

    const sum = readings.reduce((acc, r) => acc + r.reading, 0);
    const average = readings.length > 0 ? sum / readings.length : null;

    const duplicateWarning = await this.checkDftDuplicates(
      companyId,
      options.jobCardId,
      options.coatType,
      readings.length,
    );

    const record = this.dftRepo.create({
      companyId,
      jobCardId: options.jobCardId,
      coatType: options.coatType,
      paintProduct: options.paintProduct,
      batchNumber: options.batchNumber,
      specMinMicrons: options.specMinMicrons,
      specMaxMicrons: options.specMaxMicrons,
      readings,
      averageMicrons: average,
      readingDate: nowISO().split("T")[0],
      capturedByName: user.name,
      capturedById: user.id ?? null,
    });

    const saved = await this.dftRepo.save(record);

    return {
      entityType: "dft",
      recordId: saved.id,
      readingsImported: readings.length,
      average,
      duplicateWarning,
    };
  }

  async importBlastProfile(
    companyId: number,
    batch: PositectorBatch,
    options: ImportBlastProfileOptions,
    user: { id?: number; name: string },
  ): Promise<ImportResult> {
    const readings: BlastProfileReadingEntry[] = batch.readings.map((r) => ({
      itemNumber: r.index,
      reading: r.value,
    }));

    if (readings.length === 0) {
      throw new BadRequestException("Batch contains no readings to import");
    }

    const sum = readings.reduce((acc, r) => acc + r.reading, 0);
    const average = readings.length > 0 ? sum / readings.length : null;

    const environmentalData = this.extractEnvironmentalData(batch);

    const duplicateWarning = await this.checkBlastDuplicates(
      companyId,
      options.jobCardId,
      readings.length,
    );

    const record = this.blastRepo.create({
      companyId,
      jobCardId: options.jobCardId,
      specMicrons: options.specMicrons,
      readings,
      averageMicrons: average,
      temperature: options.temperature ?? environmentalData.temperature,
      humidity: options.humidity ?? environmentalData.humidity,
      readingDate: nowISO().split("T")[0],
      capturedByName: user.name,
      capturedById: user.id ?? null,
    });

    const saved = await this.blastRepo.save(record);

    return {
      entityType: "blast_profile",
      recordId: saved.id,
      readingsImported: readings.length,
      average,
      duplicateWarning,
    };
  }

  async importShoreHardness(
    companyId: number,
    batch: PositectorBatch,
    options: ImportShoreHardnessOptions,
    user: { id?: number; name: string },
  ): Promise<ImportResult> {
    if (batch.readings.length === 0) {
      throw new BadRequestException("Batch contains no readings to import");
    }

    const { readings, averages } = this.distributeToShoreGrid(batch.readings);

    const duplicateWarning = await this.checkShoreDuplicates(
      companyId,
      options.jobCardId,
      batch.readings.length,
    );

    const record = this.shoreRepo.create({
      companyId,
      jobCardId: options.jobCardId,
      rubberSpec: options.rubberSpec,
      rubberBatchNumber: options.rubberBatchNumber,
      requiredShore: options.requiredShore,
      readings,
      averages,
      readingDate: nowISO().split("T")[0],
      capturedByName: user.name,
      capturedById: user.id ?? null,
    });

    const saved = await this.shoreRepo.save(record);

    return {
      entityType: "shore_hardness",
      recordId: saved.id,
      readingsImported: batch.readings.length,
      average: averages.overall,
      duplicateWarning,
    };
  }

  detectCoatTypeFromBatchName(batchName: string | null): DftCoatType | null {
    if (!batchName) return null;
    const lower = batchName.toLowerCase();

    if (
      lower.includes("primer") ||
      lower.includes("first") ||
      lower.includes("base") ||
      lower.includes("1st")
    ) {
      return DftCoatType.PRIMER;
    }

    if (
      lower.includes("final") ||
      lower.includes("top") ||
      lower.includes("finish") ||
      lower.includes("2nd") ||
      lower.includes("second")
    ) {
      return DftCoatType.FINAL;
    }

    return null;
  }

  private distributeToShoreGrid(rawReadings: PositectorReading[]): {
    readings: ShoreHardnessReadings;
    averages: ShoreHardnessAverages;
  } {
    const perColumn = Math.ceil(rawReadings.length / 4);

    const column1 = rawReadings.slice(0, perColumn).map((r) => r.value);
    const column2 = rawReadings.slice(perColumn, perColumn * 2).map((r) => r.value);
    const column3 = rawReadings.slice(perColumn * 2, perColumn * 3).map((r) => r.value);
    const column4 = rawReadings.slice(perColumn * 3).map((r) => r.value);

    const columnAverage = (col: number[]): number | null => {
      if (col.length === 0) return null;
      return col.reduce((a, b) => a + b, 0) / col.length;
    };

    const avg1 = columnAverage(column1);
    const avg2 = columnAverage(column2);
    const avg3 = columnAverage(column3);
    const avg4 = columnAverage(column4);

    const allValues = [...column1, ...column2, ...column3, ...column4];
    const overall =
      allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : null;

    return {
      readings: { column1, column2, column3, column4 },
      averages: { column1: avg1, column2: avg2, column3: avg3, column4: avg4, overall },
    };
  }

  private extractEnvironmentalData(batch: PositectorBatch): {
    temperature: number | null;
    humidity: number | null;
  } {
    const headerRaw = batch.header.raw;
    let temperature: number | null = null;
    let humidity: number | null = null;

    const tempKey = Object.keys(headerRaw).find(
      (k) => k.toLowerCase().includes("temp") || k.toLowerCase().includes("ta"),
    );
    const humidityKey = Object.keys(headerRaw).find(
      (k) => k.toLowerCase().includes("humid") || k.toLowerCase().includes("rh"),
    );

    if (tempKey) {
      const parsed = parseFloat(headerRaw[tempKey]);
      if (!Number.isNaN(parsed)) temperature = parsed;
    }

    if (humidityKey) {
      const parsed = parseFloat(headerRaw[humidityKey]);
      if (!Number.isNaN(parsed)) humidity = parsed;
    }

    return { temperature, humidity };
  }

  private async checkDftDuplicates(
    companyId: number,
    jobCardId: number,
    coatType: DftCoatType,
    readingCount: number,
  ): Promise<boolean> {
    const today = nowISO().split("T")[0];
    const existing = await this.dftRepo
      .createQueryBuilder("d")
      .where("d.companyId = :companyId", { companyId })
      .andWhere("d.jobCardId = :jobCardId", { jobCardId })
      .andWhere("d.coatType = :coatType", { coatType })
      .andWhere("d.readingDate = :today", { today })
      .getCount();

    return existing > 0;
  }

  private async checkBlastDuplicates(
    companyId: number,
    jobCardId: number,
    readingCount: number,
  ): Promise<boolean> {
    const today = nowISO().split("T")[0];
    const existing = await this.blastRepo
      .createQueryBuilder("b")
      .where("b.companyId = :companyId", { companyId })
      .andWhere("b.jobCardId = :jobCardId", { jobCardId })
      .andWhere("b.readingDate = :today", { today })
      .getCount();

    return existing > 0;
  }

  private async checkShoreDuplicates(
    companyId: number,
    jobCardId: number,
    readingCount: number,
  ): Promise<boolean> {
    const today = nowISO().split("T")[0];
    const existing = await this.shoreRepo
      .createQueryBuilder("s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("s.jobCardId = :jobCardId", { jobCardId })
      .andWhere("s.readingDate = :today", { today })
      .getCount();

    return existing > 0;
  }
}
