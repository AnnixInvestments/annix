import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { nowISO } from "../lib/datetime";
import { ComplySaAuditLog } from "./entities/audit-log.entity";
import { ComplySaChecklistProgress } from "./entities/checklist-progress.entity";
import { ComplySaComplianceRequirement } from "./entities/compliance-requirement.entity";
import { ComplySaComplianceStatus } from "./entities/compliance-status.entity";
import { ComplySaDeadlineService } from "./services/deadline.service";
import { ComplySaRuleEngineService } from "./services/rule-engine.service";

interface UpdateStatusDto {
  status?: string;
  notes?: string;
  lastCompletedDate?: string;
}

@Injectable()
export class ComplySaComplianceService {
  constructor(
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
    @InjectRepository(ComplySaComplianceRequirement)
    private readonly requirementRepository: Repository<ComplySaComplianceRequirement>,
    @InjectRepository(ComplySaChecklistProgress)
    private readonly checklistRepository: Repository<ComplySaChecklistProgress>,
    @InjectRepository(ComplySaAuditLog)
    private readonly auditLogRepository: Repository<ComplySaAuditLog>,
    @InjectRepository(ComplySaCompany)
    private readonly companyRepository: Repository<ComplySaCompany>,
    private readonly ruleEngineService: ComplySaRuleEngineService,
    private readonly deadlineService: ComplySaDeadlineService,
  ) {}

  async assessCompany(companyId: number): Promise<ComplySaComplianceStatus[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const matchedRequirements = await this.ruleEngineService.matchRequirements(company);

    const statuses = await Promise.all(
      matchedRequirements.map(async (requirement) => {
        const existing = await this.statusRepository.findOne({
          where: { companyId, requirementId: requirement.id },
        });

        const nextDueDate = this.deadlineService.calculateNextDueDate(requirement, company);

        if (existing !== null) {
          existing.nextDueDate = nextDueDate;
          return this.statusRepository.save(existing);
        } else {
          const status = this.statusRepository.create({
            companyId,
            requirementId: requirement.id,
            status: "in_progress",
            nextDueDate,
          });
          return this.statusRepository.save(status);
        }
      }),
    );

    return statuses;
  }

  async companyDashboard(companyId: number) {
    const statuses = await this.statusRepository.find({
      where: { companyId },
      relations: ["requirement"],
    });

    const totalCount = statuses.length;
    const compliantCount = statuses.filter((s) => s.status === "compliant").length;
    const overallScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const groupedByStatus = statuses.reduce(
      (acc, status) => {
        const key = status.status;
        const existing = acc[key] ?? [];
        return { ...acc, [key]: [...existing, status] };
      },
      {} as Record<string, ComplySaComplianceStatus[]>,
    );

    return {
      overallScore,
      totalRequirements: totalCount,
      compliantCount,
      statuses,
      groupedByStatus,
    };
  }

  async updateStatus(
    companyId: number,
    statusId: number,
    dto: UpdateStatusDto,
  ): Promise<ComplySaComplianceStatus> {
    const status = await this.statusRepository.findOne({
      where: { id: statusId, companyId },
    });

    if (status === null) {
      throw new NotFoundException("Compliance status not found");
    }

    const previousStatus = status.status;

    if (dto.status !== undefined) {
      status.status = dto.status;
    }
    if (dto.notes !== undefined) {
      status.notes = dto.notes;
    }
    if (dto.lastCompletedDate !== undefined) {
      status.lastCompletedDate = dto.lastCompletedDate;
    }

    const saved = await this.statusRepository.save(status);

    const auditEntry = this.auditLogRepository.create({
      companyId,
      action: "status_change",
      entityType: "compliance_status",
      entityId: statusId,
      details: { previousStatus, newStatus: saved.status },
    });
    await this.auditLogRepository.save(auditEntry);

    return saved;
  }

  async toggleChecklistStep(
    companyId: number,
    requirementId: number,
    stepIndex: number,
    userId: number,
  ): Promise<ComplySaChecklistProgress> {
    const existing = await this.checklistRepository.findOne({
      where: { companyId, requirementId, stepIndex },
    });

    if (existing !== null) {
      existing.completed = !existing.completed;
      existing.completedAt = existing.completed ? nowISO() : null;
      existing.completedByUserId = existing.completed ? userId : null;
      const saved = await this.checklistRepository.save(existing);
      await this.autoCompleteStatus(companyId, requirementId, userId);
      return saved;
    } else {
      const requirement = await this.requirementRepository.findOne({
        where: { id: requirementId },
      });

      if (requirement === null) {
        throw new NotFoundException("Requirement not found");
      }

      const stepLabel =
        requirement.checklistSteps !== null && stepIndex < requirement.checklistSteps.length
          ? requirement.checklistSteps[stepIndex]
          : `Step ${stepIndex + 1}`;

      const progress = this.checklistRepository.create({
        companyId,
        requirementId,
        stepIndex,
        stepLabel,
        completed: true,
        completedAt: nowISO(),
        completedByUserId: userId,
      });

      const saved = await this.checklistRepository.save(progress);
      await this.autoCompleteStatus(companyId, requirementId, userId);
      return saved;
    }
  }

  async allRequirements(): Promise<ComplySaComplianceRequirement[]> {
    return this.requirementRepository.find();
  }

  private async autoCompleteStatus(
    companyId: number,
    requirementId: number,
    userId: number,
  ): Promise<void> {
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId },
    });

    if (requirement === null || requirement.checklistSteps === null) {
      return;
    }

    const totalSteps = requirement.checklistSteps.length;
    const completedSteps = await this.checklistRepository.count({
      where: { companyId, requirementId, completed: true },
    });

    if (completedSteps >= totalSteps) {
      const status = await this.statusRepository.findOne({
        where: { companyId, requirementId },
      });

      if (status !== null && status.status !== "compliant") {
        status.status = "compliant";
        status.lastCompletedDate = nowISO();
        status.completedByUserId = userId;
        await this.statusRepository.save(status);

        const auditEntry = this.auditLogRepository.create({
          companyId,
          userId,
          action: "checklist_complete",
          entityType: "compliance_status",
          entityId: status.id,
          details: { requirementId, totalSteps },
        });
        await this.auditLogRepository.save(auditEntry);
      }
    }
  }
}
