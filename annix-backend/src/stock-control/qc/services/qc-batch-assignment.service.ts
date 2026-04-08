import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard } from "../../entities/job-card.entity";
import { QcBatchAssignment } from "../entities/qc-batch-assignment.entity";

@Injectable()
export class QcBatchAssignmentService {
  constructor(
    @InjectRepository(QcBatchAssignment)
    private readonly assignmentRepo: Repository<QcBatchAssignment>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
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
}
