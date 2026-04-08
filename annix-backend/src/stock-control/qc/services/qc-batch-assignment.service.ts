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
