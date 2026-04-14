import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { fromISO, now } from "../../../lib/datetime";
import { JobCard } from "../../entities/job-card.entity";
import { PositectorUpload } from "../entities/positector-upload.entity";
import { QcBatchAssignment } from "../entities/qc-batch-assignment.entity";
import { QcEnvironmentalBatchLink } from "../entities/qc-environmental-batch-link.entity";
import { QcEnvironmentalRecord } from "../entities/qc-environmental-record.entity";

const FIELD_KEY_LOOKBACK_DAYS: Record<string, number> = {
  paint_blast_profile: 0,
  rubber_blast_profile: 0,
  paint_dft_primer: 2,
  paint_dft_intermediate: 2,
  paint_dft_final: 2,
  rubber_shore_hardness: 4,
};

@Injectable()
export class QcBatchAssignmentService {
  private readonly logger = new Logger(QcBatchAssignmentService.name);

  constructor(
    @InjectRepository(QcBatchAssignment)
    private readonly assignmentRepo: Repository<QcBatchAssignment>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(QcEnvironmentalRecord)
    private readonly envRecordRepo: Repository<QcEnvironmentalRecord>,
    @InjectRepository(QcEnvironmentalBatchLink)
    private readonly envLinkRepo: Repository<QcEnvironmentalBatchLink>,
    @InjectRepository(PositectorUpload)
    private readonly uploadRepo: Repository<PositectorUpload>,
  ) {}

  async assignmentsForJobCard(companyId: number, jobCardId: number): Promise<QcBatchAssignment[]> {
    return this.assignmentRepo.find({
      where: { companyId, jobCardId },
      order: { fieldKey: "ASC", batchNumber: "ASC" },
    });
  }

  async assignmentsForCpo(companyId: number, cpoId: number): Promise<QcBatchAssignment[]> {
    return this.assignmentRepo.find({
      where: { companyId, cpoId },
      order: { jobCardId: "ASC", fieldKey: "ASC", batchNumber: "ASC" },
    });
  }

  async saveBatchAssignment(
    companyId: number,
    jobCardId: number,
    data: {
      fieldKey: string;
      category: string;
      label: string;
      batchNumber: string;
      lineItemIds: number[];
      notApplicable?: boolean;
    },
    user: { id?: number; name: string },
  ): Promise<QcBatchAssignment[]> {
    const jc = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });
    if (!jc) {
      throw new Error(`Job card ${jobCardId} not found`);
    }
    const cpoId = jc.cpoId || null;

    const results: QcBatchAssignment[] = [];
    for (const lineItemId of data.lineItemIds) {
      const existing = await this.assignmentRepo.findOne({
        where: { lineItemId, fieldKey: data.fieldKey },
      });

      if (existing && existing.batchNumber !== data.batchNumber) {
        throw new Error(
          `Item ${lineItemId} is already assigned to batch "${existing.batchNumber}" for ${data.fieldKey}`,
        );
      }

      if (existing) {
        existing.batchNumber = data.batchNumber;
        existing.notApplicable = data.notApplicable || false;
        existing.capturedByName = user.name;
        existing.capturedById = user.id ?? null;
        results.push(await this.assignmentRepo.save(existing));
      } else {
        const assignment = this.assignmentRepo.create({
          companyId,
          batchNumber: data.batchNumber,
          fieldKey: data.fieldKey,
          category: data.category,
          label: data.label,
          lineItemId,
          jobCardId,
          cpoId,
          notApplicable: data.notApplicable || false,
          capturedByName: user.name,
          capturedById: user.id ?? null,
        });
        results.push(await this.assignmentRepo.save(assignment));
      }
    }
    return results;
  }

  async removeAssignment(companyId: number, id: number): Promise<void> {
    await this.assignmentRepo.delete({ id, companyId });
  }

  async unassignedItemsForJobCard(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<number[]> {
    const assigned = await this.assignmentRepo.find({
      where: { companyId, jobCardId, fieldKey },
      select: ["lineItemId"],
    });
    const assignedIds = new Set(assigned.map((a) => a.lineItemId));

    const jc = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["lineItems"],
    });
    if (!jc) return [];

    return (jc.lineItems || [])
      .filter((item: any) => !assignedIds.has(item.id))
      .map((item: any) => item.id);
  }

  async completionSummaryForCpo(
    companyId: number,
    cpoId: number,
  ): Promise<Record<string, { total: number; assigned: number; fieldKey: string }>> {
    const assignments = await this.assignmentRepo.find({
      where: { companyId, cpoId },
    });

    const summary: Record<string, { total: number; assigned: number; fieldKey: string }> = {};
    for (const a of assignments) {
      if (!summary[a.fieldKey]) {
        summary[a.fieldKey] = {
          total: 0,
          assigned: 0,
          fieldKey: a.fieldKey,
        };
      }
      summary[a.fieldKey].assigned += 1;
    }
    return summary;
  }

  async requiredEnvironmentalDateRange(
    companyId: number,
    jobCardId: number,
  ): Promise<{
    requiredDates: string[];
    coveredDates: string[];
    missingDates: string[];
    earliestDate: string | null;
    latestDate: string | null;
  }> {
    const uploads = await this.uploadRepo.find({
      where: { linkedJobCardId: jobCardId, companyId },
    });

    if (uploads.length === 0) {
      return {
        requiredDates: [],
        coveredDates: [],
        missingDates: [],
        earliestDate: null,
        latestDate: null,
      };
    }

    const requiredDateSet = new Set<string>();

    for (const upload of uploads) {
      const measurementDateStr = upload.measurementDate;
      const header = upload.headerData as Record<string, unknown> | null;
      const createdStr = header ? (header.Created as string) : null;
      const fallbackDate = upload.createdAt ? fromISO(upload.createdAt.toISOString()) : null;
      const uploadDate = measurementDateStr
        ? fromISO(measurementDateStr)
        : createdStr
          ? fromISO(createdStr)
          : fallbackDate;
      if (!uploadDate?.isValid) continue;

      const batchName = upload.batchName;
      const assignments = batchName
        ? await this.assignmentRepo.find({
            where: { companyId, jobCardId, batchNumber: batchName },
          })
        : [];

      const fieldKeys =
        assignments.length > 0
          ? assignments.map((a) => a.fieldKey)
          : [this.inferFieldKeyFromUpload(upload)];

      let maxLookback = 0;
      for (const fk of fieldKeys) {
        const lookback = this.lookbackForFieldKey(fk);
        if (lookback > maxLookback) maxLookback = lookback;
      }

      for (let d = maxLookback; d >= 0; d--) {
        const date = uploadDate.minus({ days: d });
        requiredDateSet.add(date.toISODate() || "");
      }
    }

    const requiredDates = [...requiredDateSet].filter(Boolean).sort();
    if (requiredDates.length === 0) {
      return {
        requiredDates: [],
        coveredDates: [],
        missingDates: [],
        earliestDate: null,
        latestDate: null,
      };
    }

    const envRecords = await this.envRecordRepo.find({
      where: { companyId, jobCardId },
    });
    const coveredSet = new Set(envRecords.map((r) => r.recordDate.slice(0, 10)));

    const coveredDates = requiredDates.filter((d) => coveredSet.has(d));
    const missingDates = requiredDates.filter((d) => !coveredSet.has(d));

    return {
      requiredDates,
      coveredDates,
      missingDates,
      earliestDate: requiredDates[0] || null,
      latestDate: requiredDates[requiredDates.length - 1] || null,
    };
  }

  private lookbackForFieldKey(fieldKey: string): number {
    const exact = FIELD_KEY_LOOKBACK_DAYS[fieldKey];
    if (exact !== undefined) return exact;
    if (fieldKey.startsWith("paint_dft_")) return 2;
    return 0;
  }

  private inferFieldKeyFromUpload(upload: PositectorUpload): string {
    const header = upload.headerData as Record<string, unknown> | null;
    const probeType = header ? String(header.ProbeType || "") : "";
    const lower = probeType.toLowerCase();
    if (lower.includes("shore") || lower.includes("hardness")) return "rubber_shore_hardness";
    if (lower.includes("dft") || lower.includes("coating")) return "paint_dft_primer";
    if (lower.includes("blast") || lower.includes("profile")) return "paint_blast_profile";
    return "paint_blast_profile";
  }

  async resolveEnvironmentalLinks(companyId: number, jobCardId: number): Promise<void> {
    const assignments = await this.assignmentRepo.find({
      where: { companyId, jobCardId },
    });

    const assignmentsWithUpload = assignments.filter((a) => a.positectorUploadId !== null);

    const uploadIds = [
      ...new Set(assignmentsWithUpload.map((a) => a.positectorUploadId as number)),
    ];
    const uploads = await Promise.all(
      uploadIds.map((uid) => this.uploadRepo.findOne({ where: { id: uid, companyId } })),
    );
    const uploadMap = new Map(uploads.filter((u) => u !== null).map((u) => [u.id, u]));

    for (const assignment of assignmentsWithUpload) {
      const upload = uploadMap.get(assignment.positectorUploadId as number);
      if (!upload) continue;

      const createdRaw = upload.headerData?.Created;
      if (!createdRaw) continue;

      const readingDate = fromISO(createdRaw);
      if (!readingDate.isValid) continue;

      const lookbackDays = FIELD_KEY_LOOKBACK_DAYS[assignment.fieldKey];
      if (lookbackDays === undefined) continue;

      const pullRule = lookbackDays === 0 ? "same_day" : `${lookbackDays}d_prior`;

      const endDate = readingDate;
      const startDate = readingDate.minus({ days: lookbackDays });

      const startDateStr = startDate.toFormat("yyyy-MM-dd");
      const endDateStr = endDate.toFormat("yyyy-MM-dd");

      const envRecords = await this.envRecordRepo.find({
        where: {
          companyId,
          jobCardId,
          recordDate: Between(startDateStr, endDateStr),
        },
      });

      for (const envRecord of envRecords) {
        const existingLink = await this.envLinkRepo.findOne({
          where: {
            batchAssignmentId: assignment.id,
            environmentalRecordId: envRecord.id,
          },
        });

        if (!existingLink) {
          const link = this.envLinkRepo.create({
            companyId,
            batchAssignmentId: assignment.id,
            environmentalRecordId: envRecord.id,
            activityDate: now().toJSDate(),
            pullRule,
            resolvedDate: new Date(envRecord.recordDate),
          });
          await this.envLinkRepo.save(link);
        }
      }
    }

    this.logger.log(
      `Resolved environmental links for JC ${jobCardId}: processed ${assignmentsWithUpload.length} assignments`,
    );
  }
}
